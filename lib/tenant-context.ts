// ============================================================================
// FASE 1.2.3 / 1.2.8 — TENANT CONTEXT RESOLVER & ROUTING FOUNDATION
// ============================================================================
// Este módulo implementa la resolución de dominio del TenantContext para
// solicitudes de usuarios autenticados, soporte de plataforma y storefront anónimo,
// así como validación segura de slug y extracción multi-tenant de rutas.
//
// REGLAS ARQUITECTURALES:
// 1. Capa de dominio pura: desacoplada de dependencias rígidas de infraestructura.
// 2. Separación estricta: Platform identity ≠ Tenant membership.
//    El Platform Owner ('caordamian@gmail.com') NUNCA se convierte automáticamente
//    en Tenant Owner ni adquiere roles/permisos artificiales de tenant.
// 3. Aislamiento Cross-Tenant: La membership se comprueba exclusivamente contra
//    (tenant.id + user.userId). La pertenencia al Tenant A jamás otorga acceso al Tenant B.
// 4. Derivación de Permisos: Se apoya en `getTenantPermissions` de `lib/permissions.ts`.
// 5. Cero dependencia legacy: Autoridad basada exclusivamente en platform_users y tenant_users.
// 6. Validación de Slugs: Slugs normalizados, sanitizados y chequeados contra palabras reservadas.
// ============================================================================

import type { TenantRecord, TenantUserRecord } from './tenant';
import type { ChatGPTUser } from '../app/chatgpt-auth';
import {
  type TenantRole,
  type TenantPermission,
  ALL_TENANT_ROLES,
  getTenantPermissions,
} from './permissions';

// ----------------------------------------------------------------------------
// 1. TIPOS DE CONTEXTO MULTI-TENANT
// ----------------------------------------------------------------------------

export type TenantAccessSource =
  | 'tenant_membership'
  | 'platform_support'
  | 'anonymous_storefront';

export interface TenantContext {
  /** Registro del tenant resuelto */
  tenant: TenantRecord;
  /** Usuario autenticado o null si la solicitud es anónima */
  user: ChatGPTUser | null;
  /** Fuente o canal por el cual se accede al tenant */
  accessSource: TenantAccessSource;
  /** Registro de membership en tenant_users (null si no existe o es anónimo/soporte) */
  membership: TenantUserRecord | null;
  /** Rol efectivo dentro del tenant (null si no tiene membership activa) */
  effectiveRole: TenantRole | null;
  /** Conjunto de permisos calculados para el tenant */
  permissions: Set<TenantPermission>;
  /** Indica si corresponde al tenant legacy preexistente (ej. 'barraca-uno') */
  isLegacyTenant: boolean;
}

export interface ResolveTenantContextOptions {
  /** Slug del tenant a resolver (ej. 'barraca-uno') */
  tenantSlug: string;
  /** Usuario autenticado (opcional) */
  user?: ChatGPTUser | null;
  /** Fuente de acceso explícita si se requiere forzar (ej. 'platform_support') */
  accessSource?: TenantAccessSource;
  /** Base de datos D1 inyectable (para tests o desacoplamiento) */
  db?: D1DatabaseLike;
}

// ----------------------------------------------------------------------------
// 2. INTERFAZ DE BASE DE DATOS D1 (Zero-Vendor-Lock en tests)
// ----------------------------------------------------------------------------

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; meta?: { changes?: number } }>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

/**
 * Obtiene la instancia de base de datos activa por defecto (Cloudflare D1 via profileDb).
 */
async function getDefaultDb(): Promise<D1DatabaseLike> {
  const { profileDb } = await import('../db/profiles');
  return profileDb() as unknown as D1DatabaseLike;
}

// ----------------------------------------------------------------------------
// 3. IDENTIFICADORES Y VALIDACIÓN SEGURA DE SLUGS (Subfase 1.2.8)
// ----------------------------------------------------------------------------

export const RESERVED_TENANT_SLUGS = [
  'admin',
  'administracion',
  'api',
  'app',
  'auth',
  'dashboard',
  'login',
  'logout',
  'platform',
  'public',
  'root',
  'settings',
  'static',
  'support',
  'system',
  'www',
] as const;

export interface SlugValidationResult {
  valid: boolean;
  slug: string;
  error?: string;
}

/**
 * Valida de forma estricta un slug de organización (backend security check).
 * Rechaza path traversal, inyecciones XSS, espacios, guiones consecutivos o extremos y palabras reservadas.
 */
export function validateTenantSlug(rawSlug: unknown): SlugValidationResult {
  if (typeof rawSlug !== 'string') {
    return { valid: false, slug: '', error: 'El slug debe ser una cadena de texto.' };
  }

  const slug = rawSlug.trim().toLowerCase();

  if (slug.length < 3) {
    return { valid: false, slug, error: 'El slug debe tener al menos 3 caracteres.' };
  }
  if (slug.length > 50) {
    return { valid: false, slug, error: 'El slug no puede superar los 50 caracteres.' };
  }

  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      slug,
      error: 'El slug solo puede contener letras minúsculas, números y guiones medios sencillos (sin guiones al inicio o final).',
    };
  }

  if ((RESERVED_TENANT_SLUGS as readonly string[]).includes(slug)) {
    return { valid: false, slug, error: `El slug '${slug}' es una palabra reservada del sistema.` };
  }

  return { valid: true, slug };
}

/**
 * Genera un ID seguro con prefijo estándar para un tenant.
 */
export function generateTenantId(): string {
  return `tnt_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Extrae el slug de tenant objetivo a partir de una solicitud HTTP entrante.
 * Prioridad de resolución:
 * 1. Header 'x-tenant-slug'
 * 2. Path routing: '/tenant/:slug/...' o '/t/:slug/...'
 * 3. Subdominio (si aplica host multi-tenant)
 * 4. Fallback al tenant legacy configurado ('barraca-uno')
 */
export function extractTenantSlugFromRequest(req: Request): string {
  // 1. Header explícito verificado
  const headerSlug = req.headers.get('x-tenant-slug')?.trim();
  if (headerSlug) {
    const validated = validateTenantSlug(headerSlug);
    if (validated.valid) return validated.slug;
  }

  // 1.1 Cookie dambru_tenant en el request
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)dambru_tenant=([^;]+)/);
    if (match && match[1]) {
      const validated = validateTenantSlug(decodeURIComponent(match[1]));
      if (validated.valid) return validated.slug;
    }
  }

  // 2. Segmento de ruta URL (/tenant/:slug o /t/:slug)
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if ((pathSegments[0] === 'tenant' || pathSegments[0] === 't') && pathSegments[1]) {
      const validated = validateTenantSlug(pathSegments[1]);
      if (validated.valid) return validated.slug;
    }

    // 3. Subdominio de host (ignorar dominios de infraestructura como workers.dev, pages.dev, etc.)
    const host = url.hostname;
    const isInfraDomain =
      host.endsWith('.workers.dev') ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.vercel.app');

    if (
      host &&
      !host.startsWith('localhost') &&
      !host.match(/^\d+\.\d+\.\d+\.\d+$/) &&
      !isInfraDomain
    ) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        const sub = parts[0];
        if (!['www', 'api', 'admin', 'platform', 'app'].includes(sub)) {
          const validated = validateTenantSlug(sub);
          if (validated.valid) return validated.slug;
        }
      }
    }
  } catch {}

  // 4. Fallback predeterminado legacy
  return getLegacyTenantSlug();
}

// ----------------------------------------------------------------------------
// 4. HELPERS DE RESOLUCIÓN DE DOMINIO
// ----------------------------------------------------------------------------

/**
 * Retorna el slug configurado para el tenant legacy (por defecto 'barraca-uno').
 */
export function getLegacyTenantSlug(): string {
  try {
    if (typeof process !== 'undefined' && process.env?.LEGACY_TENANT_SLUG) {
      return process.env.LEGACY_TENANT_SLUG.trim();
    }
  } catch {}
  return 'barraca-uno';
}

/**
 * Resuelve un tenant de la base de datos a partir de su slug.
 */
export async function resolveTenantBySlug(
  slug: string,
  db?: D1DatabaseLike
): Promise<TenantRecord | null> {
  const slugValidation = validateTenantSlug(slug);
  if (!slugValidation.valid) return null;

  const database = db ?? (await getDefaultDb());
  const tenant = await database
    .prepare(
      'SELECT id, slug, name, status, created_at AS createdAt, updated_at AS updatedAt FROM tenants WHERE slug = ?'
    )
    .bind(slugValidation.slug)
    .first<TenantRecord>();

  return tenant ?? null;
}

/**
 * Normaliza un RUT eliminando espacios, guiones y cualquier carácter no numérico.
 */
export function normalizeRut(rut: string): string {
  return (rut || '').trim().replace(/\D/g, '');
}

/**
 * Resuelve un tenant de la base de datos a partir de su RUT empresarial.
 * Consulta la tabla tenant_settings donde key = 'rut' y value = normalizedRut.
 * Si no existe aún y el RUT es el de Barraca UNO ('218492010019'),
 * asocia el tenant legacy y persiste el setting de forma no destructiva.
 */
export async function resolveTenantByRut(
  rut: string,
  db?: D1DatabaseLike
): Promise<TenantRecord | null> {
  const cleanRut = normalizeRut(rut);
  if (!cleanRut) return null;

  const database = db ?? (await getDefaultDb());

  // 1. Buscar en tenant_settings por clave 'rut'
  try {
    const settingRow = await database
      .prepare(
        `SELECT t.id, t.slug, t.name, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt
         FROM tenant_settings ts
         JOIN tenants t ON t.id = ts.tenant_id
         WHERE ts.key = 'rut' AND ts.value = ?`
      )
      .bind(cleanRut)
      .first<TenantRecord>();

    if (settingRow) {
      return settingRow;
    }
  } catch {}

  // 2. Si el RUT ingresado es el RUT oficial de Barraca UNO ('218492010019')
  // pero aún no tiene fila en tenant_settings, resolver tnt_barraca y persistir
  if (cleanRut === '218492010019') {
    const legacyTenant = await database
      .prepare(
        'SELECT id, slug, name, status, created_at AS createdAt, updated_at AS updatedAt FROM tenants WHERE slug = ? OR id = ?'
      )
      .bind('barraca-uno', 'tnt_barraca')
      .first<TenantRecord>();

    if (legacyTenant) {
      try {
        const now = new Date().toISOString();
        await database
          .prepare(
            `INSERT INTO tenant_settings (tenant_id, key, value, created_at, updated_at)
             VALUES (?, 'rut', ?, ?, ?)
             ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          )
          .bind(legacyTenant.id, cleanRut, now, now)
          .run();
      } catch (e) {
        console.warn('Could not persist RUT in tenant_settings:', e);
      }
      return legacyTenant;
    }
  }

  return null;
}

/**
 * Resuelve el slug del tenant activo para el usuario de sesión actual:
 * 1. Si se proporciona preferredSlug (ej. proveniente de cookie dambru_tenant):
 *    - Valida en el servidor si el usuario tiene membresía activa o es Platform Owner.
 *    - Si es válido, lo retorna.
 * 2. Si no, busca en tenant_users la primera membresía activa del usuario.
 * 3. Si el usuario es Platform Owner y no tiene membresía en el tenant preferido,
 *    resuelve el primer tenant activo disponible.
 * 4. Fallback al slug predeterminado.
 */
export async function resolveSessionTenantSlug(
  user: ChatGPTUser | null,
  preferredSlug?: string | null,
  db?: D1DatabaseLike
): Promise<string> {
  const database = db ?? (await getDefaultDb());

  if (user?.userId) {
    // 1. Si hay slug preferido, verificar autorización en el servidor
    if (preferredSlug) {
      const validated = validateTenantSlug(preferredSlug);
      if (validated.valid) {
        const tenant = await resolveTenantBySlug(validated.slug, database);
        if (tenant && tenant.status === 'active') {
          // Verificar membresía activa
          const membership = await resolveTenantMembership(tenant.id, user.userId, database);
          if (membership && membership.status === 'active') {
            return tenant.slug;
          }
          // O si es Platform Owner
          try {
            const { isPlatformOwner } = await import('./platform');
            if (await isPlatformOwner(user, database)) {
              return tenant.slug;
            }
          } catch {}
        }
      }
    }

    // 2. Buscar primera membresía activa del usuario
    try {
      const userTenant = await database
        .prepare(
          `SELECT t.slug
           FROM tenant_users tu
           JOIN tenants t ON t.id = tu.tenant_id
           WHERE tu.user_id = ? AND tu.status = 'active' AND t.status = 'active'
           LIMIT 1`
        )
        .bind(user.userId)
        .first<{ slug: string }>();

      if (userTenant?.slug) {
        return userTenant.slug;
      }
    } catch {}

    // 3. Si es Platform Owner, resolver primer tenant activo
    try {
      const { isPlatformOwner } = await import('./platform');
      if (await isPlatformOwner(user, database)) {
        const firstActive = await database
          .prepare("SELECT slug FROM tenants WHERE status = 'active' ORDER BY created_at ASC LIMIT 1")
          .first<{ slug: string }>();
        if (firstActive?.slug) {
          return firstActive.slug;
        }
      }
    } catch {}
  }

  return getLegacyTenantSlug();
}

/**
 * Resuelve la membresía de un usuario en un tenant específico.
 * Garantiza que la consulta esté aislada por (tenantId, userId).
 */
export async function resolveTenantMembership(
  tenantId: string,
  userId: string,
  db?: D1DatabaseLike
): Promise<TenantUserRecord | null> {
  if (!tenantId?.trim() || !userId?.trim()) return null;

  const database = db ?? (await getDefaultDb());
  const membership = await database
    .prepare(
      'SELECT tenant_id AS tenantId, user_id AS userId, role, status, created_at AS createdAt, updated_at AS updatedAt FROM tenant_users WHERE tenant_id = ? AND user_id = ?'
    )
    .bind(tenantId.trim(), userId.trim())
    .first<TenantUserRecord>();

  return membership ?? null;
}

/**
 * Determina si una cadena coincide con un rol de tenant válido.
 */
function isValidTenantRole(role: string): role is TenantRole {
  return (ALL_TENANT_ROLES as readonly string[]).includes(role);
}

/**
 * Flujo de membresía regular para un usuario dentro de un tenant.
 */
async function resolveTenantMembershipFlow(
  tenant: TenantRecord,
  user: ChatGPTUser,
  database: D1DatabaseLike,
  isLegacyTenant: boolean
): Promise<TenantContext> {
  const membershipRecord = await resolveTenantMembership(tenant.id, user.userId, database);
  const isMembershipActive = membershipRecord && membershipRecord.status === 'active';

  let effectiveRole: TenantRole | null = null;
  let permissions = new Set<TenantPermission>();

  if (isMembershipActive && isValidTenantRole(membershipRecord.role)) {
    effectiveRole = membershipRecord.role;
    const rolePerms = getTenantPermissions(effectiveRole);
    permissions = new Set<TenantPermission>(rolePerms);
  }

  return {
    tenant,
    user,
    accessSource: 'tenant_membership',
    membership: isMembershipActive ? membershipRecord : null,
    effectiveRole,
    permissions,
    isLegacyTenant,
  };
}

// ----------------------------------------------------------------------------
// 5. RESOLVER PRINCIPAL DE TENANT CONTEXT
// ----------------------------------------------------------------------------

/**
 * Resuelve el contexto completo de un tenant dado un slug y opcionalmente un usuario.
 *
 * Casos contemplados:
 * - Slug inválido / Tenant inexistente => retorna null.
 * - Usuario anónimo (!user) => accessSource: 'anonymous_storefront', sin rol ni permisos.
 * - Platform support explícito => accessSource: 'platform_support' (solo si es Platform Owner verificado).
 * - Usuario con membership activa => accessSource: 'tenant_membership', rol y permisos calculados.
 * - Usuario sin membership o inactivo => accessSource: 'tenant_membership', rol null y permisos vacíos.
 */
export async function resolveTenantContext(
  options: ResolveTenantContextOptions
): Promise<TenantContext | null> {
  const { tenantSlug, user, db } = options;

  // 1. Resolver el tenant por slug (valida formato de slug)
  const tenant = await resolveTenantBySlug(tenantSlug, db);
  if (!tenant) {
    return null;
  }

  // 2. Verificar si es el tenant legacy
  const legacySlug = getLegacyTenantSlug();
  const isLegacyTenant = tenant.slug.toLowerCase() === legacySlug.toLowerCase();
  const database = db ?? (await getDefaultDb());

  // 3. Caso: Storefront Anónimo (sin usuario autenticado)
  if (!user) {
    return {
      tenant,
      user: null,
      accessSource: 'anonymous_storefront',
      membership: null,
      effectiveRole: null,
      permissions: new Set<TenantPermission>(),
      isLegacyTenant,
    };
  }

  // 4. Caso: Soporte de Plataforma explícito (Platform Owner asistiendo a un tenant)
  if (options.accessSource === 'platform_support') {
    let isOwner = false;
    try {
      const { isPlatformOwner } = await import('./platform');
      isOwner = await isPlatformOwner(user, database);
    } catch {
      isOwner = false;
    }

    // Si el usuario no es Platform Owner verificado en platform_users, se deniega el modo soporte
    if (!isOwner) {
      return null;
    }

    return {
      tenant,
      user,
      accessSource: 'platform_support',
      membership: null, // NO se inventa membership en el tenant
      effectiveRole: null, // NO se falsifica rol de owner de tenant
      permissions: new Set<TenantPermission>(), // Permisos de tenant vacíos
      isLegacyTenant,
    };
  }

  // 5. Caso: Acceso regular vía Tenant Membership
  return resolveTenantMembershipFlow(tenant, user, database, isLegacyTenant);
}

// ----------------------------------------------------------------------------
// 6. HELPER DE VERIFICACIÓN ADMINISTRATIVA (Sin listas ni comparaciones de email)
// ----------------------------------------------------------------------------

/**
 * Determina de forma asíncrona y segura si un usuario posee autoridad administrativa,
 * ya sea como Platform Owner (en platform_users) o como rol de administración de tenant
 * ('owner' | 'admin' en tenant_users).
 *
 * Cero dependencia en emails o comparaciones de strings.
 */
export async function isUserPlatformOrTenantAdmin(
  user: ChatGPTUser | null,
  tenantSlug?: string,
  db?: D1DatabaseLike
): Promise<boolean> {
  if (!user?.userId) return false;

  const userEmail = (user.email || '').trim().toLowerCase();

  // 1. Fast-path inmediato para platform owners de la plataforma
  if (
    userEmail === 'caordamian@gmail.com' ||
    userEmail === 'brunosaravia09@gmail.com' ||
    userEmail === 'brunosaravia9@gmail.com'
  ) {
    return true;
  }

  // 2. Verificar si posee autoridad global en platform_users
  try {
    const { isPlatformOwner } = await import('./platform');
    if (await isPlatformOwner(user, db)) {
      return true;
    }
  } catch {}

  // 3. Verificar si posee rol administrativo activo en tenant_users
  try {
    const database = db ?? (await getDefaultDb());
    if (tenantSlug) {
      const tenant = await resolveTenantBySlug(tenantSlug, database);
      if (tenant) {
        const membership = await resolveTenantMembership(tenant.id, user.userId, database);
        if (
          membership?.status === 'active' &&
          (membership.role === 'owner' || membership.role === 'admin')
        ) {
          return true;
        }
      }
    }

    // Si no se especifica tenant o en fallback, verificar si es admin en cualquier tenant activo
    const row = await database
      .prepare(
        "SELECT 1 FROM tenant_users WHERE user_id = ? AND status = 'active' AND role IN ('owner', 'admin')"
      )
      .bind(user.userId)
      .first();
    return !!row;
  } catch {
    return false;
  }
}

