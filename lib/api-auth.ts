// ============================================================================
// FASE 1.2.5 — CRITICAL API HARDENING: API AUTH & TENANT RESOLUTION
// ============================================================================
// Este módulo centraliza la resolución de TenantContext y la comprobación
// RBAC para las rutas HTTP (app/api/**).
//
// REGLAS ARQUITECTURALES:
// 1. El cliente NUNCA decide el tenant. No se confía en body.tenant_id ni query.
// 2. Se apoya en `resolveTenantContext` (lib/tenant-context.ts).
// 3. Aplica RBAC estricto según `TenantPermission` (lib/permissions.ts).
// 4. Cero autorización legacy: Toda autoridad deriva de platform_users o tenant_users.
// 5. Retorna respuestas HTTP estructuradas y consistentes (401, 403, 404).
// ============================================================================

import type { ChatGPTUser } from '../app/chatgpt-auth';
import {
  resolveTenantContext,
  resolveTenantBySlug,
  getLegacyTenantSlug,
  extractTenantSlugFromRequest,
  type TenantContext,
  type TenantAccessSource,
} from './tenant-context';
import { type TenantPermission } from './permissions';

export interface ApiAuthResult {
  authorized: boolean;
  context: TenantContext | null;
  user: ChatGPTUser | null;
  response?: Response;
}

/**
 * Resuelve el usuario de sesión de forma desacoplada y segura.
 */
async function resolveSessionUser(): Promise<ChatGPTUser | null> {
  try {
    const { getChatGPTUser } = await import('../app/chatgpt-auth');
    return await getChatGPTUser();
  } catch {
    return null;
  }
}

/**
 * Genera una respuesta 401 Unauthorized uniforme.
 */
export function unauthorizedResponse(message = 'Iniciá sesión para continuar.'): Response {
  return Response.json(
    { error: message },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Genera una respuesta 403 Forbidden uniforme.
 */
export function forbiddenResponse(
  message = 'No tenés permisos para realizar esta acción.'
): Response {
  return Response.json(
    { error: message },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Genera una respuesta 404 Not Found uniforme.
 * Se prefiere 404 sobre 403 para recursos de otros tenants para evitar enumeración.
 */
export function notFoundResponse(message = 'Recurso no encontrado.'): Response {
  return Response.json(
    { error: message },
    { status: 404, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Resuelve el TenantContext de la solicitud actual.
 */
export async function getRequestTenantContext(
  req?: Request,
  userOverride?: ChatGPTUser | null,
  db?: any
): Promise<TenantContext | null> {
  const user = userOverride !== undefined ? userOverride : await resolveSessionUser();

  let tenantSlug = getLegacyTenantSlug();
  let requestedAccessSource: TenantAccessSource = 'tenant_membership';

  if (req) {
    tenantSlug = extractTenantSlugFromRequest(req);
    const supportHeader = req.headers.get('x-platform-support')?.trim();
    if (supportHeader === 'true' || supportHeader === '1') {
      requestedAccessSource = 'platform_support';
    }
  }

  return resolveTenantContext({
    tenantSlug,
    user,
    accessSource: requestedAccessSource,
    db,
  });
}

/**
 * Verifica autenticación y permisos RBAC en una sola llamada estandarizada.
 */
export async function requireApiPermission(
  req: Request | undefined,
  permission: TenantPermission,
  options?: {
    userOverride?: ChatGPTUser | null;
    db?: any;
    allowAnonymousStorefront?: boolean;
  }
): Promise<ApiAuthResult> {
  // FAST PATH: Si se permite lectura pública de storefront (catálogo público de productos)
  if (options?.allowAnonymousStorefront) {
    const slug = req ? extractTenantSlugFromRequest(req) : getLegacyTenantSlug();
    const tenant = await resolveTenantBySlug(slug, options?.db);
    if (!tenant) {
      return {
        authorized: false,
        context: null,
        user: null,
        response: notFoundResponse('Organización no encontrada.'),
      };
    }
    const context: TenantContext = {
      tenant,
      user: null,
      accessSource: 'anonymous_storefront',
      membership: null,
      effectiveRole: null,
      permissions: new Set<TenantPermission>(['products:read', 'stock:read']),
      isLegacyTenant: tenant.slug === getLegacyTenantSlug(),
    };
    return {
      authorized: true,
      context,
      user: null,
    };
  }

  const user =
    options?.userOverride !== undefined ? options.userOverride : await resolveSessionUser();

  // Comprobar autenticación
  if (!user) {
    return {
      authorized: false,
      context: null,
      user: null,
      response: unauthorizedResponse(),
    };
  }

  // 1. Verificación contra spoofing de soporte:
  const isSupportRequested =
    req?.headers.get('x-platform-support')?.trim() === 'true' ||
    req?.headers.get('x-platform-support')?.trim() === '1';

  if (isSupportRequested) {
    const { isPlatformOwner } = await import('./platform');
    const isOwner = user ? await isPlatformOwner(user, options?.db) : false;
    if (!isOwner) {
      return {
        authorized: false,
        context: null,
        user,
        response: forbiddenResponse('Acceso de soporte denegado: se requiere rol de Platform Owner.'),
      };
    }
  }

  const context = await getRequestTenantContext(req, user, options?.db);

  if (!context) {
    return {
      authorized: false,
      context: null,
      user: null,
      response: notFoundResponse('Organización no encontrada.'),
    };
  }

  // 2. Autoridad directa para Platform Owners (acceso administrativo global)
  try {
    const { isPlatformOwner } = await import('./platform');
    if (await isPlatformOwner(user, options?.db)) {
      return {
        authorized: true,
        context,
        user,
      };
    }
  } catch {}

  // 2. Comprobar autorización de Platform Support
  if (context.accessSource === 'platform_support') {
    const { getPlatformRole } = await import('./platform');
    const platformRole = await getPlatformRole(user, options?.db);

    const { isPlatformSupportAuthorized } = await import('./authorization');
    const isAuthorized = isPlatformSupportAuthorized(platformRole, context.tenant, permission);

    if (isAuthorized) {
      return {
        authorized: true,
        context,
        user,
      };
    }

    return {
      authorized: false,
      context,
      user,
      response: forbiddenResponse(
        `Operación '${permission}' no permitida bajo modo de soporte de plataforma.`
      ),
    };
  }

  // 3. Comprobar permisos RBAC vía membership activa
  if (context.effectiveRole) {
    if (context.permissions.has(permission)) {
      return {
        authorized: true,
        context,
        user,
      };
    }
    return {
      authorized: false,
      context,
      user,
      response: forbiddenResponse(`Permiso requerido no asignado: ${permission}`),
    };
  }

  // 4. Usuario autenticado pero sin membresía activa en este tenant
  return {
    authorized: false,
    context,
    user,
    response: forbiddenResponse('No pertenecés a esta organización.'),
  };
}

