import {
  unauthorizedResponse,
  forbiddenResponse,
} from '../../../../lib/api-auth';
import {
  createTenant,
  getUserTenants,
  listAllTenants,
} from '../../../../lib/tenant-onboarding';
import { isPlatformOwner } from '../../../../lib/platform';
import { profileDb } from '../../../../db/profiles';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function resolveSessionUser() {
  try {
    const { getChatGPTUser } = await import('../../../../app/chatgpt-auth');
    return await getChatGPTUser();
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/tenants
 * Lista los tenants accesibles para el usuario autenticado:
 * - Platform Owner: lista todas las organizaciones de la plataforma.
 * - Usuario regular: lista únicamente las organizaciones en las que posee membresía activa.
 */
export async function GET(req: Request) {
  const user = await resolveSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const db = profileDb();
    const isPlatformAdmin = await isPlatformOwner(user, db);

    if (isPlatformAdmin) {
      const allTenants = await listAllTenants(db);
      return json({
        isPlatformOwner: true,
        tenants: allTenants,
      });
    }

    const userMemberships = await getUserTenants(user.userId, db);
    return json({
      isPlatformOwner: false,
      memberships: userMemberships,
    });
  } catch (error) {
    console.error('Error listing tenants:', error);
    return json({ error: 'No se pudieron cargar las organizaciones.' }, 500);
  }
}

/**
 * POST /api/admin/tenants
 * Crea una nueva organización de forma atómica.
 * Restringido estrictamente a Platform Owners con permiso 'tenants:manage'.
 */
export async function POST(req: Request) {
  const user = await resolveSessionUser();
  if (!user) {
    return unauthorizedResponse();
  }

  let body: {
    name?: unknown;
    slug?: unknown;
    ownerEmail?: unknown;
    ownerDisplayName?: unknown;
    initialSettings?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'Payload JSON inválido.' }, 400);
  }

  try {
    const db = profileDb();

    // 1. Verificación de autoridad de plataforma (solo platform_owner puede crear)
    const isPlatformAdmin = await isPlatformOwner(user, db);
    if (!isPlatformAdmin) {
      return forbiddenResponse('Solo los Platform Owners pueden crear nuevas organizaciones.');
    }

    // 2. Ejecutar onboarding atómico
    const result = await createTenant({
      name: String(body.name || ''),
      slug: String(body.slug || ''),
      ownerEmail: String(body.ownerEmail || ''),
      ownerDisplayName: body.ownerDisplayName ? String(body.ownerDisplayName) : undefined,
      creatorUser: user,
      initialSettings: (body.initialSettings && typeof body.initialSettings === 'object')
        ? (body.initialSettings as Record<string, string>)
        : undefined,
      db,
    });

    if (!result.success) {
      return json({ error: result.error }, result.statusCode || 400);
    }

    return json(
      {
        ok: true,
        tenant: result.tenant,
        owner: result.owner,
      },
      201
    );
  } catch (error) {
    console.error('Error creating tenant:', error);
    return json({ error: 'Error interno del servidor al crear la organización.' }, 500);
  }
}
