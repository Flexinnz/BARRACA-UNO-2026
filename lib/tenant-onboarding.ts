// ============================================================================
// FASE 1.2.8 — TENANT ONBOARDING, LIFECYCLE & TENANT CREATION
// ============================================================================
// Este módulo implementa la lógica de servidor para la creación de tenants,
// onboarding inicial, selección de organizaciones y asignación de owner inicial.
//
// REGLAS ARQUITECTURALES:
// 1. Solo un Platform Owner con permiso 'tenants:manage' puede crear nuevos tenants.
// 2. Slugs validados estrictamente (sin path traversal, XSS, espacios ni colisiones).
// 3. Creación atómica: tenant + owner inicial + configuraciones iniciales.
// 4. El cliente NUNCA decide el rol. El backend asigna estrictamente 'owner'.
// 5. El creador (Platform Owner) NUNCA se añade a 'tenant_users'.
// 6. Si falla cualquier paso del onboarding, se ejecuta rollback completo sin huérfanos.
// ============================================================================

import type { ChatGPTUser } from '../app/chatgpt-auth';
import type { TenantRecord, TenantUserRecord } from './tenant';
import {
  type D1DatabaseLike,
  validateTenantSlug,
  generateTenantId,
} from './tenant-context';
import { type TenantRole } from './permissions';
import {
  isPlatformOwner,
  hasPlatformPermission,
  getPlatformRole,
  resolvePlatformUser,
  BOOTSTRAP_PLATFORM_OWNER_EMAILS,
} from './platform';

export interface CreateTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerDisplayName?: string;
  creatorUser: ChatGPTUser;
  initialSettings?: Record<string, string>;
  db?: D1DatabaseLike;
}

export interface CreateTenantResult {
  success: boolean;
  tenant?: TenantRecord;
  owner?: {
    userId: string;
    email: string;
    role: 'owner';
  };
  error?: string;
  statusCode?: number;
}

export interface UserTenantMembership {
  tenant: TenantRecord;
  role: TenantRole;
  status: string;
}

async function getDefaultDb(): Promise<D1DatabaseLike> {
  const { profileDb } = await import('../db/profiles');
  return profileDb() as unknown as D1DatabaseLike;
}

/**
 * Crea una nueva organización (tenant) de forma atómica y segura.
 *
 * Flujo:
 * 1. Verifica autorización de plataforma del creador ('tenants:manage').
 * 2. Valida nombre y slug (formato, longitud, reserved words, caracteres permitidos).
 * 3. Comprueba unicidad de slug.
 * 4. Resuelve o crea la cuenta global para el owner inicial.
 * 5. Inserta tenant + membership de owner + settings iniciales.
 * 6. En caso de error, ejecuta rollback completo.
 */
export async function createTenant(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  const database = input.db ?? (await getDefaultDb());

  // 1. Verificar identidad y permiso de plataforma del creador
  const creatorRole = await getPlatformRole(input.creatorUser, database);
  if (!creatorRole || !hasPlatformPermission(creatorRole, 'tenants:manage')) {
    return {
      success: false,
      error: 'Acceso denegado: Se requiere rol de Platform Owner con permiso tenants:manage para crear organizaciones.',
      statusCode: 403,
    };
  }

  // 2. Validar nombre de la organización
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    return {
      success: false,
      error: 'El nombre de la organización debe tener entre 2 y 100 caracteres.',
      statusCode: 400,
    };
  }

  // 3. Validar slug (reglas estrictas)
  const slugValidation = validateTenantSlug(input.slug);
  if (!slugValidation.valid) {
    return {
      success: false,
      error: slugValidation.error ?? 'Slug inválido.',
      statusCode: 400,
    };
  }
  const slug = slugValidation.slug;

  // 4. Comprobar unicidad de slug en la base de datos
  const existingTenant = await database
    .prepare('SELECT id FROM tenants WHERE slug = ?')
    .bind(slug)
    .first<{ id: string }>();

  if (existingTenant) {
    return {
      success: false,
      error: `La organización con el slug '${slug}' ya existe.`,
      statusCode: 409,
    };
  }

  // 5. Validar y resolver el usuario owner inicial
  const ownerEmail = input.ownerEmail?.trim().toLowerCase();
  if (!ownerEmail || !ownerEmail.includes('@') || ownerEmail.length < 5) {
    return {
      success: false,
      error: 'Se requiere un email válido para el propietario de la organización.',
      statusCode: 400,
    };
  }

  // 5.1 Verificar que el nuevo owner no sea un Platform Owner existente
  if (BOOTSTRAP_PLATFORM_OWNER_EMAILS.includes(ownerEmail)) {
    return {
      success: false,
      error: 'Un Platform Owner no puede ser asignado como owner de un tenant. Los roles de plataforma y tenant deben permanecer estrictamente separados.',
      statusCode: 400,
    };
  }

  const now = new Date().toISOString();
  let ownerAccount = await database
    .prepare('SELECT user_id AS userId FROM accounts WHERE lower(email) = ?')
    .bind(ownerEmail)
    .first<{ userId: string }>();

  if (ownerAccount) {
    const existingPlatform = await resolvePlatformUser(ownerAccount.userId, database);
    if (existingPlatform && existingPlatform.status === 'active') {
      return {
        success: false,
        error: 'Un Platform Owner no puede ser asignado como owner de un tenant. Los roles de plataforma y tenant deben permanecer estrictamente separados.',
        statusCode: 400,
      };
    }
  }

  let ownerUserId = '';
  let createdNewAccount = false;
  const tenantId = generateTenantId();

  try {
    if (ownerAccount) {
      ownerUserId = ownerAccount.userId;
    } else {
      // Si la cuenta no existe en accounts, crearla de forma limpia
      createdNewAccount = true;
      ownerUserId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;

      await database
        .prepare(
          `INSERT INTO accounts (user_id, email, status, created_at, last_seen_at, updated_at, auth_version)
           VALUES (?, ?, 'active', ?, ?, ?, 0)`
        )
        .bind(ownerUserId, ownerEmail, now, now, now)
        .run();

      const displayName = input.ownerDisplayName?.trim() || ownerEmail.split('@')[0];
      await database
        .prepare(
          `INSERT INTO profiles (user_id, email, display_name, company, phone, bio, avatar, accent, theme, density, updated_at)
           VALUES (?, ?, ?, ?, '', '', 'initials', 'ocean', 'dark', 'comfortable', ?)
           ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at`
        )
        .bind(ownerUserId, ownerEmail, displayName, name, now)
        .run();
    }

    // 6. Creación Atómica del Tenant y su Owner
    // 6.1 Crear registro en tenants
    await database
      .prepare(
        `INSERT INTO tenants (id, slug, name, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)`
      )
      .bind(tenantId, slug, name, now, now)
      .run();

    // 6.2 Asignar membresía de Owner en tenant_users (rol estricto 'owner', asignado por backend)
    await database
      .prepare(
        `INSERT INTO tenant_users (tenant_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, 'owner', 'active', ?, ?)`
      )
      .bind(tenantId, ownerUserId, now, now)
      .run();

    // 6.3 Crear settings iniciales si fueron provistas
    if (input.initialSettings && Object.keys(input.initialSettings).length > 0) {
      for (const [key, value] of Object.entries(input.initialSettings)) {
        await database
          .prepare(
            `INSERT INTO tenant_settings (tenant_id, key, value, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(tenantId, key.trim(), String(value), now, now)
          .run();
      }
    }

    const tenantRecord: TenantRecord = {
      id: tenantId,
      slug,
      name,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    return {
      success: true,
      tenant: tenantRecord,
      owner: {
        userId: ownerUserId,
        email: ownerEmail,
        role: 'owner',
      },
      statusCode: 201,
    };
  } catch (err) {
    // ROLLBACK ATÓMICO: limpiar cualquier registro parcial en caso de falla
    try {
      if (tenantId) {
        await database.prepare('DELETE FROM tenant_settings WHERE tenant_id = ?').bind(tenantId).run();
        await database.prepare('DELETE FROM tenant_users WHERE tenant_id = ?').bind(tenantId).run();
        await database.prepare('DELETE FROM tenants WHERE id = ?').bind(tenantId).run();
      }
      if (createdNewAccount && ownerUserId) {
        await database.prepare('DELETE FROM profiles WHERE user_id = ?').bind(ownerUserId).run();
        await database.prepare('DELETE FROM accounts WHERE user_id = ?').bind(ownerUserId).run();
      }
    } catch {}

    return {
      success: false,
      error: `Error durante la creación del tenant: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 500,
    };
  }
}

/**
 * Obtiene la lista de organizaciones en las que un usuario posee membresía activa.
 */
export async function getUserTenants(
  userId: string,
  db?: D1DatabaseLike
): Promise<UserTenantMembership[]> {
  if (!userId?.trim()) return [];

  const database = db ?? (await getDefaultDb());
  const rows = await database
    .prepare(
      `SELECT t.id, t.slug, t.name, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
              tu.role, tu.status AS userStatus
       FROM tenant_users tu
       JOIN tenants t ON t.id = tu.tenant_id
       WHERE tu.user_id = ? AND tu.status = 'active' AND t.status = 'active'
       ORDER BY t.created_at DESC`
    )
    .bind(userId.trim())
    .all<{
      id: string;
      slug: string;
      name: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      role: TenantRole;
      userStatus: string;
    }>();

  return (rows.results ?? []).map((r) => ({
    tenant: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
    role: r.role,
    status: r.userStatus,
  }));
}

/**
 * Obtiene todas las organizaciones registradas en la plataforma (exclusivo para Platform Owners).
 */
export async function listAllTenants(
  db?: D1DatabaseLike
): Promise<TenantRecord[]> {
  const database = db ?? (await getDefaultDb());
  const rows = await database
    .prepare(
      `SELECT id, slug, name, status, created_at AS createdAt, updated_at AS updatedAt
       FROM tenants
       ORDER BY created_at DESC`
    )
    .all<TenantRecord>();

  return rows.results ?? [];
}
