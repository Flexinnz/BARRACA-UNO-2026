// ============================================================================
// FASE 1.2.4 — SECURE DATA LAYER: TENANT SCOPE
// ============================================================================
// Este módulo define el tipo y los validadores fundamentales de TenantScope.
// Toda operación tenant-scoped exige un TenantScope válido y no vacío.
// ============================================================================

import type { TenantContext } from '../tenant-context';

export type TenantScope =
  | string
  | { tenant: { id: string } }
  | { tenantId: string }
  | TenantContext;

/**
 * Extrae y valida estrictamente el tenantId de cualquier objeto TenantScope.
 * Lanza un error controlado si el scope es nulo, inválido o tiene un tenantId vacío.
 */
export function extractTenantId(scope: TenantScope): string {
  if (typeof scope === 'string') {
    const trimmed = scope.trim();
    if (!trimmed) {
      throw new Error('Secure Data Layer: tenantId cannot be an empty string.');
    }
    return trimmed;
  }

  if (scope && typeof scope === 'object') {
    if ('tenant' in scope && scope.tenant && typeof scope.tenant.id === 'string') {
      const trimmed = scope.tenant.id.trim();
      if (!trimmed) {
        throw new Error('Secure Data Layer: scope.tenant.id cannot be an empty string.');
      }
      return trimmed;
    }

    if ('tenantId' in scope && typeof scope.tenantId === 'string') {
      const trimmed = scope.tenantId.trim();
      if (!trimmed) {
        throw new Error('Secure Data Layer: scope.tenantId cannot be an empty string.');
      }
      return trimmed;
    }
  }

  throw new Error(
    'Secure Data Layer: Invalid TenantScope provided. Operations require a valid tenantId, TenantContext or { tenantId } object.'
  );
}

/**
 * Interfaz unificada de base de datos D1 para permitir inyección en tests
 * sin acoplamiento forzado a Cloudflare runtime.
 */
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; meta?: { changes?: number } }>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch?(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

/**
 * Resuelve la base de datos D1 activa (por defecto profileDb en runtime Cloudflare).
 */
export async function getDefaultDb(): Promise<D1DatabaseLike> {
  const { profileDb } = await import('../../db/profiles');
  return profileDb() as unknown as D1DatabaseLike;
}
