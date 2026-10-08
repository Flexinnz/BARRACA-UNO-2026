import {
  requireApiPermission,
  notFoundResponse,
  forbiddenResponse,
} from '../../../../lib/api-auth';
import { tenantUsersRepository } from '../../../../lib/data';
import { profileDb } from '../../../../db/profiles';
import { ALL_TENANT_ROLES, type TenantRole } from '../../../../lib/permissions';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const ADMIN_EMAILS = new Set([
  'caordamian@gmail.com',
  'brunosaravia09@gmail.com',
  'brunosaravia9@gmail.com',
  'integemini@gmail.com',
]);

interface AccountDbRow {
  userId: string;
  email: string;
  status: string;
  displayName: string;
  company: string;
  phone: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  tenantRole: string | null;
  tenantStatus: string | null;
  platformRole: string | null;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
}

export async function GET(req: Request) {
  const auth = await requireApiPermission(req, 'users:read');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  try {
    const db = profileDb();
    const tenantId = auth.context.tenant.id;

    // Obtener todas las cuentas registradas con sus perfiles, roles y métricas de pedidos en este tenant
    const query = `
      SELECT 
        a.user_id AS userId,
        a.email,
        a.status,
        COALESCE(p.display_name, a.email) AS displayName,
        COALESCE(p.company, '') AS company,
        COALESCE(p.phone, '') AS phone,
        a.created_at AS createdAt,
        COALESCE(a.last_seen_at, a.created_at) AS lastSeenAt,
        a.updated_at AS updatedAt,
        tu.role AS tenantRole,
        tu.status AS tenantStatus,
        pu.role AS platformRole,
        COALESCE((SELECT SUM(total) FROM orders WHERE user_id = a.user_id AND status != 'cancelled' AND (tenant_id = ? OR tenant_id IS NULL)), 0) AS totalSpent,
        COALESCE((SELECT COUNT(1) FROM orders WHERE user_id = a.user_id AND status != 'cancelled' AND (tenant_id = ? OR tenant_id IS NULL)), 0) AS ordersCount,
        (SELECT MAX(created_at) FROM orders WHERE user_id = a.user_id AND (tenant_id = ? OR tenant_id IS NULL)) AS lastOrderAt
      FROM accounts a
      LEFT JOIN profiles p ON p.user_id = a.user_id
      LEFT JOIN tenant_users tu ON tu.user_id = a.user_id AND tu.tenant_id = ?
      LEFT JOIN platform_users pu ON pu.user_id = a.user_id
      UNION ALL
      SELECT 
        p.user_id AS userId,
        p.email,
        'active' AS status,
        p.display_name AS displayName,
        COALESCE(p.company, '') AS company,
        COALESCE(p.phone, '') AS phone,
        p.updated_at AS createdAt,
        p.updated_at AS lastSeenAt,
        p.updated_at AS updatedAt,
        tu.role AS tenantRole,
        tu.status AS tenantStatus,
        pu.role AS platformRole,
        COALESCE((SELECT SUM(total) FROM orders WHERE user_id = p.user_id AND status != 'cancelled' AND (tenant_id = ? OR tenant_id IS NULL)), 0) AS totalSpent,
        COALESCE((SELECT COUNT(1) FROM orders WHERE user_id = p.user_id AND status != 'cancelled' AND (tenant_id = ? OR tenant_id IS NULL)), 0) AS ordersCount,
        (SELECT MAX(created_at) FROM orders WHERE user_id = p.user_id AND (tenant_id = ? OR tenant_id IS NULL)) AS lastOrderAt
      FROM profiles p
      LEFT JOIN tenant_users tu ON tu.user_id = p.user_id AND tu.tenant_id = ?
      LEFT JOIN platform_users pu ON pu.user_id = p.user_id
      WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = p.user_id)
      ORDER BY createdAt DESC
    `;

    const [accountsRows, eventsRes] = await Promise.all([
      db
        .prepare(query)
        .bind(tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId)
        .all<AccountDbRow>(),
      db
        .prepare(
          'SELECT id, target_email AS targetEmail, action, created_at AS createdAt FROM account_events ORDER BY id DESC LIMIT 30'
        )
        .all<{ id: number; targetEmail: string; action: string; createdAt: string }>(),
    ]);

    const accountsResult = (accountsRows.results || []).map((row) => {
      const emailLower = (row.email || '').trim().toLowerCase();
      const isAdmin =
        ADMIN_EMAILS.has(emailLower) ||
        row.tenantRole === 'owner' ||
        row.tenantRole === 'admin' ||
        row.platformRole === 'platform_owner' ||
        row.platformRole === 'platform_admin';

      return {
        userId: row.userId,
        email: row.email,
        displayName: row.displayName,
        company: row.company,
        phone: row.phone,
        status: row.status,
        role: row.tenantRole || (isAdmin ? 'admin' : 'customer'),
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        updatedAt: row.updatedAt,
        totalSpent: row.totalSpent || 0,
        ordersCount: row.ordersCount || 0,
        lastOrderAt: row.lastOrderAt || undefined,
        isAdmin,
      };
    });

    return json({
      accounts: accountsResult,
      events: eventsRes.results || [],
      currentUserId: auth.user.userId,
    });
  } catch (e) {
    console.error('Account registry read failed', e);
    return json({ error: 'No pudimos cargar el registro de cuentas.' }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'users:manage');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let input: { userId?: unknown; action?: unknown; role?: unknown; confirmation?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  if (
    !input ||
    typeof input.userId !== 'string' ||
    !input.userId ||
    !['block', 'activate', 'delete', 'change_role', 'set_role', 'add'].includes(String(input.action))
  ) {
    return json({ error: 'Revisá la cuenta y la acción solicitada.' }, 400);
  }

  const targetUserId = input.userId.trim();
  const action = String(input.action);

  // 1. Protección contra inyección de Platform Role
  if (input.role === 'platform_owner') {
    return json({ error: 'Rol de plataforma no permitido en organizaciones.' }, 400);
  }

  // 2. Validación explícita de rol si la acción modifica o asigna roles
  if (['change_role', 'set_role', 'add'].includes(action)) {
    const requestedRole = String(input.role || '');
    if (!(ALL_TENANT_ROLES as readonly string[]).includes(requestedRole)) {
      return json({ error: 'Rol de organización inválido.' }, 400);
    }

    // Regla de Protección de Owner: admin ≠ ownership transfer
    const callerRole = auth.context.effectiveRole;
    if (requestedRole === 'owner' && callerRole !== 'owner') {
      return forbiddenResponse('Solo el propietario puede gestionar la titularidad.');
    }
  }

  try {
    const db = profileDb();

    // Caso: Agregar nuevo miembro al tenant
    if (action === 'add') {
      const roleToAdd = String(input.role || 'employee') as TenantRole;
      await tenantUsersRepository.addTenantUser(auth.context, targetUserId, roleToAdd);
      return json({ ok: true, status: 'active', role: roleToAdd });
    }

    // Verificar si es miembro del tenant
    const targetMember = await tenantUsersRepository.getTenantUser(auth.context, targetUserId);

    // Protección contra auto-bloqueo o auto-eliminación
    if (targetUserId === auth.user.userId) {
      return forbiddenResponse('No podés modificar tu propia cuenta.');
    }

    // Protección absoluta de la cuenta de Owner
    if (targetMember?.role === 'owner') {
      return forbiddenResponse('La cuenta del propietario está protegida.');
    }

    // Caso: Modificar rol de miembro
    if (action === 'change_role' || action === 'set_role') {
      if (!targetMember) {
        return notFoundResponse('El usuario no pertenece a esta organización.');
      }
      const newRole = String(input.role) as TenantRole;
      await tenantUsersRepository.updateTenantUserRole(auth.context, targetUserId, newRole);
      return json({ ok: true, role: newRole });
    }

    // Obtener correo del usuario para registrar en eventos
    const targetAccount = await db
      .prepare(
        'SELECT email FROM accounts WHERE user_id = ? UNION SELECT email FROM profiles WHERE user_id = ? LIMIT 1'
      )
      .bind(targetUserId, targetUserId)
      .first<{ email: string }>();
    const targetEmail = targetAccount?.email || targetUserId;

    const now = new Date().toISOString();

    // Actualizar membership en tenant si existe
    if (targetMember) {
      if (action === 'delete') {
        await tenantUsersRepository.removeTenantUser(auth.context, targetUserId);
      } else {
        const nextStatus = action === 'block' ? 'blocked' : 'active';
        await tenantUsersRepository.updateTenantUserStatus(auth.context, targetUserId, nextStatus);
      }
    }

    // Actualizar estado en accounts y profiles
    if (action === 'delete') {
      await db
        .prepare("UPDATE accounts SET status = 'deleted', updated_at = ? WHERE user_id = ?")
        .bind(now, targetUserId)
        .run();
      await db
        .prepare(
          "UPDATE profiles SET display_name = 'Perfil eliminado', company = '', phone = '', bio = '', updated_at = ? WHERE user_id = ?"
        )
        .bind(now, targetUserId)
        .run();
    } else if (action === 'block') {
      await db
        .prepare("UPDATE accounts SET status = 'blocked', updated_at = ? WHERE user_id = ?")
        .bind(now, targetUserId)
        .run();
    } else if (action === 'activate') {
      await db
        .prepare("UPDATE accounts SET status = 'active', updated_at = ? WHERE user_id = ?")
        .bind(now, targetUserId)
        .run();
    }

    // Registrar en historial de eventos
    if (targetEmail) {
      await db
        .prepare(
          'INSERT INTO account_events (target_email, action, created_at) VALUES (?, ?, ?)'
        )
        .bind(targetEmail, action, now)
        .run();
    }

    const finalStatus = action === 'delete' ? 'deleted' : action === 'block' ? 'blocked' : 'active';
    return json({ ok: true, status: finalStatus });
  } catch (e) {
    console.error('Account management failed', e);
    return json({ error: 'No pudimos aplicar el cambio.' }, 503);
  }
}
