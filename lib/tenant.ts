import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '../app/chatgpt-auth';
import { profileDb } from '../db/profiles';

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUserRecord {
  tenantId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type TenantContext = 
  | { type: 'storefront'; tenant: TenantRecord }
  | { type: 'saas_admin'; tenant: TenantRecord; user: ChatGPTUser; membership: TenantUserRecord }
  | { type: 'platform_admin'; user: ChatGPTUser };

export function generateTenantId(): string {
  // Prefixed 32-char hex string, safe and standard
  return `tnt_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function resolveLegacyTenant(): Promise<TenantRecord | null> {
  // Read slug from Cloudflare Workers env binding, Node process.env, or default legacy slug
  const slug = (
    (typeof env !== 'undefined' && env.LEGACY_TENANT_SLUG) ||
    (typeof process !== 'undefined' && process.env?.LEGACY_TENANT_SLUG) ||
    'barraca-uno'
  )?.trim();

  if (!slug) {
    console.warn('LEGACY_TENANT_SLUG no está configurado.');
    return null;
  }
  
  const db = profileDb();
  const tenant = await db
    .prepare('SELECT id, slug, name, status, created_at AS createdAt, updated_at AS updatedAt FROM tenants WHERE slug = ?')
    .bind(slug)
    .first<TenantRecord>();
  
  return tenant ?? null;
}
