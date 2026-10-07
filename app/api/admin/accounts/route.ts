import {
  requireApiPermission,
  notFoundResponse,
  forbiddenResponse,
} from '../../../../lib/api-auth';
import { tenantUsersRepository, ordersRepository } from '../../../../lib/data';
import { profileDb } from '../../../../db/profiles';
import { ALL_TENANT_ROLES, type TenantRole } from '../../../../lib/permissions';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  const auth = await requireApiPermission(req, 'users:read');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  try {
    const db = profileDb();

    // 1. Obtener los miembros asignados estrictamente a este tenant
    const tenantMembers = await tenantUsersRepository.getTenantUsers(auth.context);

    // 2. Obtener los pedidos de este tenant para calcular gasto de cada usuario en el tenant
    const tenantOrders = await ordersRepository.getOrders(auth.context, 1000);

    const userStats = new Map<string, { totalSpent: number; ordersCount: number; lastOrderAt?: string }>();
    for (const ord of tenantOrders) {
      const current = userStats.get(ord.userId) ?? { totalSpent: 0, ordersCount: 0 };
      if (ord.status !== 'cancelled') {
        current.totalSpent += ord.total;
        current.ordersCount += 1;
      }
      if (!current.lastOrderAt || ord.createdAt > current.lastOrderAt) {
        current.lastOrderAt = ord.createdAt;
      }
      userStats.set(ord.userId, current);
    }

    const accountsResult = [];
    for (const member of tenantMembers) {
      const profile = await db
        .prepare('SELECT email, display_name, company, phone FROM profiles WHERE user_id = ?')
        .bind(member.userId)
        .first<{ email: string; display_name: string; company: string; phone: string }>();

      const stats = userStats.get(member.userId) ?? { totalSpent: 0, ordersCount: 0 };

      accountsResult.push({
        userId: member.userId,
        email: profile?.email || '',
        displayName: profile?.display_name || profile?.email || member.userId,
        company: profile?.company || '',
        phone: profile?.phone || '',
        status: member.status,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        totalSpent: stats.totalSpent,
        ordersCount: stats.ordersCount,
        lastOrderAt: stats.lastOrderAt,
        isAdmin: member.role === 'owner' || member.role === 'admin',
      });
    }

    return json({
      accounts: accountsResult,
      events: [],
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
    // Caso: Agregar nuevo miembro al tenant
    if (action === 'add') {
      const roleToAdd = String(input.role || 'employee') as TenantRole;
      await tenantUsersRepository.addTenantUser(auth.context, targetUserId, roleToAdd);
      return json({ ok: true, status: 'active', role: roleToAdd });
    }

    // Para mutaciones sobre miembros existentes: verificar pertenencia estricta
    const targetMember = await tenantUsersRepository.getTenantUser(auth.context, targetUserId);
    if (!targetMember) {
      return notFoundResponse('El usuario no pertenece a esta organización.');
    }

    // Protección contra auto-bloqueo o auto-eliminación
    if (targetMember.userId === auth.user.userId) {
      return forbiddenResponse('No podés modificar tu propia cuenta.');
    }

    // Protección absoluta de la cuenta de Owner
    if (targetMember.role === 'owner') {
      return forbiddenResponse('La cuenta del propietario está protegida.');
    }

    // Caso: Modificar rol de miembro
    if (action === 'change_role' || action === 'set_role') {
      const newRole = String(input.role) as TenantRole;
      await tenantUsersRepository.updateTenantUserRole(auth.context, targetUserId, newRole);
      return json({ ok: true, role: newRole });
    }

    // Caso: Eliminar membresía
    if (action === 'delete') {
      await tenantUsersRepository.removeTenantUser(auth.context, targetUserId);
      return json({ ok: true, status: 'deleted' });
    }

    // Caso: Bloquear o activar miembro
    const nextStatus = action === 'block' ? 'blocked' : 'active';
    await tenantUsersRepository.updateTenantUserStatus(auth.context, targetUserId, nextStatus);
    return json({ ok: true, status: nextStatus });
  } catch (e) {
    console.error('Account management failed', e);
    return json({ error: 'No pudimos aplicar el cambio.' }, 503);
  }
}
