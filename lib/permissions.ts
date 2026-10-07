// ============================================================================
// FASE 1.2.1 — RBAC: ROLES & PERMISSIONS MODEL
// ============================================================================
// Este módulo define los tipos puros, matrices RBAC y helpers de autorización
// para la plataforma SaaS y los tenants individuales.
//
// SEPARACIÓN ESTRICTA DE NIVELES:
// 1. Platform Level: 'platform_owner' (Super Admin / dueño de la infraestructura SaaS).
// 2. Tenant Level: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer'.
//
// Estos dos niveles son ortogonales e independientes. Un PlatformRole nunca
// es un TenantRole, y ningún TenantPermission satisface un PlatformPermission.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. ROLES
// ----------------------------------------------------------------------------

export type PlatformRole = 'platform_owner';

export type TenantRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'employee'
  | 'viewer';

export const ALL_PLATFORM_ROLES: readonly PlatformRole[] = [
  'platform_owner',
] as const;

export const ALL_TENANT_ROLES: readonly TenantRole[] = [
  'owner',
  'admin',
  'manager',
  'employee',
  'viewer',
] as const;

// ----------------------------------------------------------------------------
// 2. PERMISOS
// ----------------------------------------------------------------------------

export type PlatformPermission =
  | 'tenants:read'
  | 'tenants:manage'
  | 'platform_users:read'
  | 'platform_users:manage'
  | 'plans:read'
  | 'plans:manage'
  | 'features:manage'
  | 'audit:read'
  | 'support:access';

export type TenantPermission =
  | 'products:read'
  | 'products:write'
  | 'products:delete'
  | 'stock:read'
  | 'stock:adjust'
  | 'orders:read'
  | 'orders:manage'
  | 'customers:read'
  | 'customers:write'
  | 'customers:delete'
  | 'users:read'
  | 'users:manage'
  | 'settings:read'
  | 'settings:manage';

export const ALL_PLATFORM_PERMISSIONS: readonly PlatformPermission[] = [
  'tenants:read',
  'tenants:manage',
  'platform_users:read',
  'platform_users:manage',
  'plans:read',
  'plans:manage',
  'features:manage',
  'audit:read',
  'support:access',
] as const;

export const ALL_TENANT_PERMISSIONS: readonly TenantPermission[] = [
  'products:read',
  'products:write',
  'products:delete',
  'stock:read',
  'stock:adjust',
  'orders:read',
  'orders:manage',
  'customers:read',
  'customers:write',
  'customers:delete',
  'users:read',
  'users:manage',
  'settings:read',
  'settings:manage',
] as const;

// ----------------------------------------------------------------------------
// HELPER INTERNO: CONJUNTOS INMUTABLES CON GUARDAS RUNTIME
// ----------------------------------------------------------------------------

function createImmutableSet<T>(items: Iterable<T>): ReadonlySet<T> {
  const set = new Set<T>(items);
  // Reemplazar métodos mutadores para garantizar inmutabilidad en runtime
  Object.defineProperties(set, {
    add: {
      value: () => { throw new TypeError('Cannot mutate a ReadonlySet'); },
      writable: false,
      configurable: false,
    },
    delete: {
      value: () => { throw new TypeError('Cannot mutate a ReadonlySet'); },
      writable: false,
      configurable: false,
    },
    clear: {
      value: () => { throw new TypeError('Cannot mutate a ReadonlySet'); },
      writable: false,
      configurable: false,
    },
  });
  return Object.freeze(set);
}

// ----------------------------------------------------------------------------
// 3. MATRIZ PLATFORM RBAC
// ----------------------------------------------------------------------------

const PLATFORM_ROLE_PERMISSIONS: Readonly<Record<PlatformRole, ReadonlySet<PlatformPermission>>> = {
  // El Platform Owner tiene acceso irrestricto sobre la plataforma SaaS
  platform_owner: createImmutableSet<PlatformPermission>(ALL_PLATFORM_PERMISSIONS),
};

// ----------------------------------------------------------------------------
// 4. MATRIZ TENANT RBAC
// ----------------------------------------------------------------------------

const TENANT_ROLE_PERMISSIONS: Readonly<Record<TenantRole, ReadonlySet<TenantPermission>>> = {
  // Owner: control total sobre la empresa
  owner: createImmutableSet<TenantPermission>(ALL_TENANT_PERMISSIONS),

  // Admin: gestión de toda la operación, excepto eliminación de clientes
  admin: createImmutableSet<TenantPermission>([
    'products:read',
    'products:write',
    'products:delete',
    'stock:read',
    'stock:adjust',
    'orders:read',
    'orders:manage',
    'customers:read',
    'customers:write',
    // NOT 'customers:delete' (reservado exclusivamente a owner)
    'users:read',
    'users:manage',
    'settings:read',
    'settings:manage',
  ] as const),

  // Manager: gestión de inventario, catálogo, pedidos y lectura de clientes
  manager: createImmutableSet<TenantPermission>([
    'products:read',
    'products:write',
    'stock:read',
    'stock:adjust',
    'orders:read',
    'orders:manage',
    'customers:read',
  ] as const),

  // Employee: mostrador, depósito y toma de pedidos
  employee: createImmutableSet<TenantPermission>([
    'products:read',
    'stock:read',
    'stock:adjust',
    'orders:read',
  ] as const),

  // Viewer: sólo lectura interna o auditoría
  viewer: createImmutableSet<TenantPermission>([
    'products:read',
    'stock:read',
    'orders:read',
  ] as const),
};

const EMPTY_PLATFORM_PERMS = createImmutableSet<PlatformPermission>([]);
const EMPTY_TENANT_PERMS = createImmutableSet<TenantPermission>([]);

// ----------------------------------------------------------------------------
// 5. HELPERS PUROS DE AUTORIZACIÓN (Zero-I/O, Zero-Dependency)
// ----------------------------------------------------------------------------

/**
 * Determina de forma determinista y síncrona si un rol de plataforma posee un permiso específico.
 */
export function hasPlatformPermission(
  role: PlatformRole,
  permission: PlatformPermission
): boolean {
  const perms = PLATFORM_ROLE_PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}

/**
 * Determina de forma determinista y síncrona si un rol de tenant posee un permiso específico.
 */
export function hasTenantPermission(
  role: TenantRole,
  permission: TenantPermission
): boolean {
  const perms = TENANT_ROLE_PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}

/**
 * Retorna el conjunto inmutable de permisos asociados a un rol de plataforma.
 */
export function getPlatformPermissions(
  role: PlatformRole
): ReadonlySet<PlatformPermission> {
  const perms = PLATFORM_ROLE_PERMISSIONS[role];
  return perms ?? EMPTY_PLATFORM_PERMS;
}

/**
 * Retorna el conjunto inmutable de permisos asociados a un rol de tenant.
 */
export function getTenantPermissions(
  role: TenantRole
): ReadonlySet<TenantPermission> {
  const perms = TENANT_ROLE_PERMISSIONS[role];
  return perms ?? EMPTY_TENANT_PERMS;
}

// ----------------------------------------------------------------------------
// 6. PLATFORM SUPPORT AUTHORIZATION MATRIX
// ----------------------------------------------------------------------------
// Define las acciones de tenant que un Platform Owner con permiso 'support:access'
// puede ejecutar sobre un tenant específico en modo 'platform_support'.
//
// Reglas estrictas:
// - NO otorga TenantRole ni membresía en tenant_users.
// - NO otorga indiscriminadamente todas las 14 TenantPermissions.
// - Excluye acciones destructivas u operacionales exclusivas del tenant
//   (ej. 'customers:delete', 'users:manage', 'customers:write', 'products:delete').
export type PlatformSupportAction =
  | 'products:read'
  | 'products:write'
  | 'stock:read'
  | 'stock:adjust'
  | 'orders:read'
  | 'orders:manage'
  | 'customers:read'
  | 'users:read'
  | 'settings:read'
  | 'settings:manage';

export const ALL_PLATFORM_SUPPORT_ACTIONS: readonly PlatformSupportAction[] = [
  'products:read',
  'products:write',
  'stock:read',
  'stock:adjust',
  'orders:read',
  'orders:manage',
  'customers:read',
  'users:read',
  'settings:read',
  'settings:manage',
] as const;

export const PLATFORM_SUPPORT_PERMISSIONS: ReadonlySet<TenantPermission> = createImmutableSet<TenantPermission>(
  ALL_PLATFORM_SUPPORT_ACTIONS
);

/**
 * Determina si una TenantPermission está permitida bajo el mecanismo de Platform Support.
 */
export function isSupportActionAllowed(permission: TenantPermission): boolean {
  return PLATFORM_SUPPORT_PERMISSIONS.has(permission);
}

