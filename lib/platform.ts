// ============================================================================
// FASE 1.2.7 — PLATFORM IDENTITY & PLATFORM OWNERS
// ============================================================================
// Este módulo define y formaliza la identidad y autoridad a nivel PLATAFORMA.
//
// SEPARACIÓN ARQUITECTÓNICA ESTRICTA:
// - PLATAFORMA: PlatformRole = 'platform_owner' (almacenado en tabla platform_users)
// - TENANT: TenantRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer' (en tenant_users)
//
// PRINCIPIOS DE AUTORIZACIÓN:
// 1. Autoridad basada en entidad, NO en email:
//    platform user → platform role → platform permissions.
//    La autorización permanente consulta la tabla 'platform_users', desacoplada
//    completamente de comparaciones hardcodeadas de strings de email.
// 2. Emails como Bootstrap Data exclusivamente:
//    Los emails de los creadores (caordamian@gmail.com, brunosaravia09@gmail.com)
//    sirven como insumo inicial para el seed/bootstrap, no como regla de autorización.
// 3. El seed de Platform Owners NO toca datos de tenants:
//    No crea, modifica ni borra tenants, memberships de Barraca Uno ni datos de integemini.
// ============================================================================

import {
  type PlatformRole,
  type PlatformPermission,
  ALL_PLATFORM_PERMISSIONS,
  ALL_PLATFORM_ROLES,
  hasPlatformPermission,
  getPlatformPermissions,
} from './permissions';
import {
  requirePlatformPermission,
  assertPlatformPermission,
  isPlatformAuthorized,
  AuthorizationError,
} from './authorization';
import type { D1DatabaseLike } from './data/scope';

// ----------------------------------------------------------------------------
// 1. DATOS DE BOOTSTRAP / SEED INICIAL (Exclusivos para inicialización)
// ----------------------------------------------------------------------------

/**
 * Cuentas iniciales utilizadas ÚNICAMENTE como datos de bootstrap para el seed.
 * NO representan el mecanismo permanente de autorización.
 */
export const BOOTSTRAP_PLATFORM_OWNER_EMAILS: readonly string[] = [
  'caordamian@gmail.com',
  'brunosaravia09@gmail.com',
] as const;

// ----------------------------------------------------------------------------
// 2. MODELO DE ENTIDAD DE PLATAFORMA (platform_users)
// ----------------------------------------------------------------------------

export interface PlatformUserRecord {
  userId: string;
  role: PlatformRole;
  status: 'active' | 'suspended' | string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformContext {
  userId: string;
  role: PlatformRole;
  permissions: ReadonlySet<PlatformPermission>;
  status: string;
}

// ----------------------------------------------------------------------------
// 3. RESOLUCIÓN DE DB PARA PLATAFORMA
// ----------------------------------------------------------------------------

async function getDefaultDb(): Promise<D1DatabaseLike> {
  const { profileDb } = await import('../db/profiles');
  return profileDb() as unknown as D1DatabaseLike;
}

// ----------------------------------------------------------------------------
// 4. RESOLVER DE AUTORIDAD DE PLATAFORMA (Entity-Backed, Zero Email-Coupling)
// ----------------------------------------------------------------------------

/**
 * Resuelve el registro de autoridad de plataforma para un usuario a partir de su userId.
 * Consulta la tabla persistente 'platform_users'.
 */
export async function resolvePlatformUser(
  userId: string,
  db?: D1DatabaseLike
): Promise<PlatformUserRecord | null> {
  if (!userId?.trim()) return null;

  try {
    const database = db ?? (await getDefaultDb());
    const row = await database
      .prepare(
        `SELECT user_id AS userId, role, status, created_at AS createdAt, updated_at AS updatedAt
         FROM platform_users
         WHERE user_id = ? AND status = 'active'`
      )
      .bind(userId.trim())
      .first<PlatformUserRecord>();

    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Resuelve el registro de plataforma a partir del email de un usuario consultando 'accounts' + 'platform_users'.
 * Únicamente utilizado cuando no se dispone de userId directo (ej. helpers de onboarding o lookup inicial).
 */
export async function resolvePlatformUserByEmail(
  email: string,
  db?: D1DatabaseLike
): Promise<PlatformUserRecord | null> {
  if (!email?.trim()) return null;

  try {
    const database = db ?? (await getDefaultDb());
    const account = await database
      .prepare('SELECT user_id AS userId FROM accounts WHERE lower(email) = ?')
      .bind(email.trim().toLowerCase())
      .first<{ userId: string }>();

    if (!account?.userId) return null;
    return await resolvePlatformUser(account.userId, database);
  } catch {
    return null;
  }
}

/**
 * Determina el PlatformRole de un usuario de forma asíncrona consultando su autoridad
 * persistente en 'platform_users'.
 *
 * REGLA DE ORO (Subfase 1.2.9):
 * - Si el usuario tiene 'userId', la autoridad proviene EXCLUSIVAMENTE de 'platform_users' para ese userId.
 *   NUNCA se recurre al email si el userId está presente (prevención 100% de email spoofing).
 * - Si no dispone de userId (consultas de lookup), se resuelve el account.userId asociado.
 */
export async function getPlatformRole(
  user: { userId?: string; email?: string } | string | null | undefined,
  db?: D1DatabaseLike
): Promise<PlatformRole | null> {
  if (!user) return null;

  // 1. Si se provee userId directo:
  const userId = typeof user === 'string' ? user : user.userId;
  if (userId?.trim()) {
    const record = await resolvePlatformUser(userId.trim(), db);
    if (record && record.role === 'platform_owner') {
      return 'platform_owner';
    }
    // Si tiene userId y no es platform_owner, NUNCA hacer fallback a email.
    return null;
  }

  // 2. Solo si NO tiene userId pero tiene email:
  const email = typeof user === 'object' ? user.email : undefined;
  if (email?.trim()) {
    const record = await resolvePlatformUserByEmail(email.trim(), db);
    if (record && record.role === 'platform_owner') {
      return 'platform_owner';
    }
  }

  return null;
}

/**
 * Valida de forma asíncrona si un usuario posee autoridad activa de Platform Owner.
 */
export async function isPlatformOwner(
  user: { userId?: string; email?: string } | string | null | undefined,
  db?: D1DatabaseLike
): Promise<boolean> {
  const role = await getPlatformRole(user, db);
  return role === 'platform_owner';
}

/**
 * Aserción asíncrona de Platform Owner. Lanza AuthorizationError estructurado si no lo es.
 */
export async function assertPlatformOwner(
  user: { userId?: string; email?: string } | string | null | undefined,
  db?: D1DatabaseLike
): Promise<void> {
  const role = await getPlatformRole(user, db);
  if (role !== 'platform_owner') {
    throw new AuthorizationError({
      domain: 'platform',
      permission: 'tenants:read',
      role: null,
      reason: 'MISSING_ROLE',
      message: 'Access denied: Platform owner role is required.',
    });
  }
}

/**
 * Retorna el contexto de plataforma tipado para el usuario autenticado.
 * Consulta exclusivamente 'platform_users' por userId.
 */
export async function getPlatformContext(
  user: { userId?: string; email?: string } | string | null | undefined,
  db?: D1DatabaseLike
): Promise<PlatformContext | null> {
  if (!user) return null;

  const userId = typeof user === 'string' ? user : user.userId;
  if (!userId?.trim()) return null;

  const record = await resolvePlatformUser(userId.trim(), db);
  if (!record || record.role !== 'platform_owner') {
    return null;
  }

  return {
    userId: record.userId,
    role: record.role,
    permissions: getPlatformPermissions(record.role),
    status: record.status,
  };
}

// ----------------------------------------------------------------------------
// 5. SEED IDEMPOTENTE Y NO DESTRUCTIVO DE PLATFORM OWNERS
// ----------------------------------------------------------------------------

export interface SeedPlatformAccountResult {
  email: string;
  userId: string;
  accountCreated: boolean;
  platformRoleAssigned: boolean;
}

export interface SeedPlatformResult {
  platformOwners: SeedPlatformAccountResult[];
}

/**
 * Inicializa y formaliza exclusivamente la autoridad de los dos Platform Owners.
 *
 * REGLAS DE SEGURIDAD Y ALCANCE (Subfase 1.2.7):
 * 1. NO crea ni modifica tenants (tenants permanece 100% intacto).
 * 2. NO crea, modifica ni borra membresías en tenant_users (0 DELETEs, 0 INSERTs en tenant_users).
 * 3. NO toca el tenant Barraca Uno ni a su owner integemini@gmail.com.
 * 4. Crea o reutiliza cuentas en 'accounts' y 'profiles'.
 * 5. Registra o actualiza la autoridad de 'platform_owner' en 'platform_users'.
 * 6. Es 100% idempotente y seguro de ejecutar múltiples veces consecutivas.
 */
export async function seedPlatformOwners(
  db?: D1DatabaseLike
): Promise<SeedPlatformResult> {
  const database = db ?? (await getDefaultDb());
  const now = new Date().toISOString();

  // Asegurar la existencia de la tabla 'platform_users' si el entorno no ha migrado aún
  try {
    await database
      .prepare(
        `CREATE TABLE IF NOT EXISTS platform_users (
          user_id text PRIMARY KEY NOT NULL REFERENCES accounts(user_id) ON DELETE CASCADE,
          role text NOT NULL DEFAULT 'platform_owner',
          status text NOT NULL DEFAULT 'active',
          created_at text NOT NULL,
          updated_at text NOT NULL
        )`
      )
      .run();
  } catch {}

  const results: SeedPlatformAccountResult[] = [];

  for (const email of BOOTSTRAP_PLATFORM_OWNER_EMAILS) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Reutilizar cuenta global existente si ya existe
    let account = await database
      .prepare('SELECT user_id AS userId, email, status FROM accounts WHERE lower(email) = ?')
      .bind(normalizedEmail)
      .first<{ userId: string; email: string; status: string }>();

    let accountCreated = false;
    let userId: string;

    if (account) {
      userId = account.userId;
      if (account.status !== 'active') {
        await database
          .prepare("UPDATE accounts SET status = 'active', updated_at = ? WHERE user_id = ?")
          .bind(now, userId)
          .run();
      }
    } else {
      accountCreated = true;
      userId = `usr_po_${normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '_')}`;

      await database
        .prepare(
          `INSERT INTO accounts (user_id, email, status, created_at, last_seen_at, updated_at, auth_version)
           VALUES (?, ?, 'active', ?, ?, ?, 0)`
        )
        .bind(userId, normalizedEmail, now, now, now)
        .run();

      const displayName =
        normalizedEmail === 'caordamian@gmail.com' ? 'Damián Caorsi' : 'Bruno Saravia';

      await database
        .prepare(
          `INSERT INTO profiles (user_id, email, display_name, company, phone, bio, avatar, accent, theme, density, updated_at)
           VALUES (?, ?, ?, 'SaaS Platform', '', 'Platform Owner / Super Admin', 'initials', 'ocean', 'dark', 'comfortable', ?)
           ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at`
        )
        .bind(userId, normalizedEmail, displayName, now)
        .run();
    }

    // 2. Formalizar autoridad en tabla platform_users (Idempotente)
    await database
      .prepare(
        `INSERT INTO platform_users (user_id, role, status, created_at, updated_at)
         VALUES (?, 'platform_owner', 'active', ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           role = 'platform_owner',
           status = 'active',
           updated_at = excluded.updated_at`
      )
      .bind(userId, now, now)
      .run();

    results.push({
      email: normalizedEmail,
      userId,
      accountCreated,
      platformRoleAssigned: true,
    });
  }

  return {
    platformOwners: results,
  };
}

// ----------------------------------------------------------------------------
// 6. RE-EXPORTS DE CONVENIENCIA
// ----------------------------------------------------------------------------

export {
  type PlatformRole,
  type PlatformPermission,
  ALL_PLATFORM_PERMISSIONS,
  ALL_PLATFORM_ROLES,
  hasPlatformPermission,
  getPlatformPermissions,
  requirePlatformPermission,
  assertPlatformPermission,
  isPlatformAuthorized,
};
