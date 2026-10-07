// ============================================================================
// FASE 1.2.2 — HELPERS DE ACCESO Y AUTORIZACIÓN (Zero-I/O, Pure & Type-Safe)
// ============================================================================
// Este módulo define los helpers de verificación y aserción de autorización
// para la plataforma SaaS y los tenants individuales.
//
// REGLAS ARQUITECTURALES:
// 1. Separación estricta de dominios: Platform vs Tenant nunca se mezclan.
// 2. Funciones puras: sin acceso a DB, cookies, headers, requests ni I/O.
// 3. No dependencias de email ni de estado global mutable.
// 4. Utiliza directamente las matrices RBAC definidas en `lib/permissions.ts`.
// ============================================================================

import {
  type PlatformRole,
  type TenantRole,
  type PlatformPermission,
  type TenantPermission,
  hasPlatformPermission,
  hasTenantPermission,
  isSupportActionAllowed,
} from './permissions';

// ----------------------------------------------------------------------------
// 1. MANEJO DE ERRORES CONTROLADOS
// ----------------------------------------------------------------------------

export type AuthorizationErrorReason = 'MISSING_ROLE' | 'INSUFFICIENT_PERMISSIONS';

/**
 * Error estructurado arrojado cuando una aserción de autorización falla.
 * Permite distinguir con precisión si el fallo se debió a falta de rol
 * (usuario anónimo / no autenticado en el contexto) o a permisos insuficientes.
 */
export class AuthorizationError extends Error {
  readonly domain: 'platform' | 'tenant';
  readonly permission: PlatformPermission | TenantPermission;
  readonly role: PlatformRole | TenantRole | null | undefined;
  readonly reason: AuthorizationErrorReason;

  constructor(params: {
    domain: 'platform' | 'tenant';
    permission: PlatformPermission | TenantPermission;
    role: PlatformRole | TenantRole | null | undefined;
    reason: AuthorizationErrorReason;
    message?: string;
  }) {
    const defaultMessage =
      params.reason === 'MISSING_ROLE'
        ? `[AuthorizationError] Missing ${params.domain} role for required permission '${params.permission}'.`
        : `[AuthorizationError] Role '${params.role}' lacks ${params.domain} permission '${params.permission}'.`;

    super(params.message ?? defaultMessage);
    this.name = 'AuthorizationError';
    this.domain = params.domain;
    this.permission = params.permission;
    this.role = params.role;
    this.reason = params.reason;

    // Mantener prototipo correcto al extender Error en TypeScript
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

// ----------------------------------------------------------------------------
// 2. HELPERS DE AUTORIZACIÓN DE PLATAFORMA (Super Admin / SaaS Owner)
// ----------------------------------------------------------------------------

/**
 * Valida de forma síncrona y pura que el rol de plataforma posea el permiso requerido.
 * Lanza AuthorizationError si el rol es null/undefined o si no tiene el permiso.
 */
export function requirePlatformPermission(
  role: PlatformRole | null | undefined,
  permission: PlatformPermission
): asserts role is PlatformRole {
  if (role === null || role === undefined) {
    throw new AuthorizationError({
      domain: 'platform',
      permission,
      role,
      reason: 'MISSING_ROLE',
      message: `Access denied: Platform role is required for permission '${permission}'.`,
    });
  }

  if (!hasPlatformPermission(role, permission)) {
    throw new AuthorizationError({
      domain: 'platform',
      permission,
      role,
      reason: 'INSUFFICIENT_PERMISSIONS',
      message: `Access denied: Platform role '${role}' lacks permission '${permission}'.`,
    });
  }
}

/**
 * Alias semántico para requirePlatformPermission.
 */
export const assertPlatformPermission = requirePlatformPermission;

/**
 * Helper booleano seguro que verifica permiso de plataforma aceptando rol nullable.
 */
export function isPlatformAuthorized(
  role: PlatformRole | null | undefined,
  permission: PlatformPermission
): boolean {
  if (!role) return false;
  return hasPlatformPermission(role, permission);
}

// ----------------------------------------------------------------------------
// 3. HELPERS DE AUTORIZACIÓN DE TENANT (Empresa / Organización)
// ----------------------------------------------------------------------------

/**
 * Valida de forma síncrona y pura que el rol de tenant posea el permiso requerido.
 * Lanza AuthorizationError si el rol es null/undefined o si no tiene el permiso.
 */
export function requireTenantPermission(
  role: TenantRole | null | undefined,
  permission: TenantPermission
): asserts role is TenantRole {
  if (role === null || role === undefined) {
    throw new AuthorizationError({
      domain: 'tenant',
      permission,
      role,
      reason: 'MISSING_ROLE',
      message: `Access denied: Tenant role is required for permission '${permission}'.`,
    });
  }

  if (!hasTenantPermission(role, permission)) {
    throw new AuthorizationError({
      domain: 'tenant',
      permission,
      role,
      reason: 'INSUFFICIENT_PERMISSIONS',
      message: `Access denied: Tenant role '${role}' lacks permission '${permission}'.`,
    });
  }
}

/**
 * Alias semántico para requireTenantPermission.
 */
export const assertTenantPermission = requireTenantPermission;

/**
 * Helper booleano seguro que verifica permiso de tenant aceptando rol nullable.
 */
export function isTenantAuthorized(
  role: TenantRole | null | undefined,
  permission: TenantPermission
): boolean {
  if (!role) return false;
  return hasTenantPermission(role, permission);
}

// ----------------------------------------------------------------------------
// 4. HELPERS DE AUTORIZACIÓN DE PLATFORM SUPPORT
// ----------------------------------------------------------------------------

/**
 * Valida de forma pura si un rol de plataforma y un tenant de destino autorizan
 * una acción específica bajo el modo de Platform Support.
 *
 * Condiciones necesarias:
 * 1. El rol debe ser de plataforma válido (ej. 'platform_owner').
 * 2. El rol debe poseer el permiso 'support:access'.
 * 3. El tenant de destino debe estar provisto y con identificador válido.
 * 4. La acción debe pertenecer a la matriz de acciones permitidas para soporte.
 */
export function isPlatformSupportAuthorized(
  platformRole: PlatformRole | null | undefined,
  targetTenant: { id: string } | null | undefined,
  action: TenantPermission
): boolean {
  if (!platformRole || !targetTenant || !targetTenant.id?.trim()) {
    return false;
  }
  if (!hasPlatformPermission(platformRole, 'support:access')) {
    return false;
  }
  return isSupportActionAllowed(action);
}

/**
 * Aserción que valida acceso de soporte. Lanza AuthorizationError si la acción no es permitida.
 */
export function requirePlatformSupport(
  platformRole: PlatformRole | null | undefined,
  targetTenant: { id: string } | null | undefined,
  action: TenantPermission
): void {
  if (!platformRole) {
    throw new AuthorizationError({
      domain: 'platform',
      permission: 'support:access',
      role: platformRole,
      reason: 'MISSING_ROLE',
      message: 'Access denied: Platform role is required for support operations.',
    });
  }

  if (!hasPlatformPermission(platformRole, 'support:access')) {
    throw new AuthorizationError({
      domain: 'platform',
      permission: 'support:access',
      role: platformRole,
      reason: 'INSUFFICIENT_PERMISSIONS',
      message: `Access denied: Platform role '${platformRole}' lacks 'support:access' permission.`,
    });
  }

  if (!targetTenant || !targetTenant.id?.trim()) {
    throw new AuthorizationError({
      domain: 'platform',
      permission: 'support:access',
      role: platformRole,
      reason: 'INSUFFICIENT_PERMISSIONS',
      message: 'Access denied: A valid target tenant is required for platform support.',
    });
  }

  if (!isSupportActionAllowed(action)) {
    throw new AuthorizationError({
      domain: 'tenant',
      permission: action,
      role: null,
      reason: 'INSUFFICIENT_PERMISSIONS',
      message: `Access denied: Action '${action}' is not permitted under platform support mode.`,
    });
  }
}

export const assertPlatformSupport = requirePlatformSupport;

