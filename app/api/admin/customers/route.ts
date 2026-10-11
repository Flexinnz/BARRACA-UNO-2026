import {
  requireApiPermission,
  notFoundResponse,
  forbiddenResponse,
} from '../../../../lib/api-auth';
import { customersRepository } from '../../../../lib/data';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function isConnectedToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 && date.getDate() === now.getDate();
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/customers
 * - Consulta lista o ficha de cliente en el tenant autorizado.
 * - Requiere permiso 'customers:read' (disponible para owner, admin, manager, platform_support).
 */
export async function GET(req: Request) {
  const auth = await requireApiPermission(req, 'customers:read');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId')?.trim();
    const search = url.searchParams.get('search')?.trim();

    // 1. Consulta individual de ficha completa con pedidos
    if (userId) {
      const customer = await customersRepository.getCustomerById(auth.context, userId);
      if (!customer) {
        return notFoundResponse('Cliente no encontrado.');
      }
      return json({ customer });
    }

    // 2. Consulta de lista completa de clientes
    const customers = await customersRepository.getCustomers(auth.context, {
      search: search || undefined,
    });

    // Calcular KPIs SaaS sobre datos reales de la empresa
    const total = customers.length;
    const connectedToday = customers.filter((c) => isConnectedToday(c.lastSeenAt)).length;
    const buyers = customers.filter((c) => (c.ordersCount || 0) > 0).length;
    const newClients = customers.filter((c) => (c.ordersCount || 0) === 0).length;
    const vipClients = customers.filter((c) => (c.totalSpent || 0) >= 5000).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgTicket = buyers > 0 ? Math.round(totalRevenue / buyers) : 0;

    return json({
      customers,
      metrics: {
        total,
        connectedToday,
        buyers,
        newClients,
        vipClients,
        totalRevenue,
        avgTicket,
      },
    });
  } catch (err) {
    console.error('Customer fetch error:', err);
    return json({ error: 'No se pudieron obtener los clientes.' }, 500);
  }
}

/**
 * POST /api/admin/customers
 * - Crea un nuevo cliente en el tenant.
 * - Requiere permiso 'customers:write' (disponible para owner, admin).
 */
export async function POST(req: Request) {
  const auth = await requireApiPermission(req, 'customers:write');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let body: {
    email?: string;
    displayName?: string;
    company?: string;
    phone?: string;
    bio?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Formato de solicitud no válido.' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  const displayName = (body.displayName || '').trim();

  if (!email || !email.includes('@')) {
    return json({ error: 'Ingresá un correo electrónico válido.' }, 400);
  }

  if (!displayName) {
    return json({ error: 'El nombre del cliente es obligatorio.' }, 400);
  }

  try {
    const customer = await customersRepository.createCustomer(auth.context, {
      email,
      displayName,
      company: body.company,
      phone: body.phone,
      bio: body.bio,
    });

    return json({ ok: true, customer }, 201);
  } catch (err) {
    console.error('Customer creation error:', err);
    return json({ error: 'No se pudo crear el cliente.' }, 500);
  }
}

/**
 * PATCH /api/admin/customers
 * - Modifica datos de contacto, empresa o estado del cliente.
 * - Requiere permiso 'customers:write' (disponible para owner, admin).
 */
export async function PATCH(req: Request) {
  const auth = await requireApiPermission(req, 'customers:write');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let body: {
    userId?: string;
    displayName?: string;
    company?: string;
    phone?: string;
    bio?: string;
    status?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Formato de solicitud no válido.' }, 400);
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return json({ error: 'El ID de cliente es obligatorio.' }, 400);
  }

  // Protección: verificar que no sea un usuario de plataforma o titular
  if (userId === auth.user.userId) {
    return forbiddenResponse('No podés editarte a vos mismo como cliente.');
  }

  try {
    await customersRepository.updateCustomer(auth.context, userId, {
      displayName: body.displayName,
      company: body.company,
      phone: body.phone,
      bio: body.bio,
      status: body.status,
    });

    return json({ ok: true });
  } catch (err) {
    console.error('Customer update error:', err);
    return json({ error: 'No se pudo actualizar el cliente.' }, 500);
  }
}

/**
 * DELETE /api/admin/customers
 * - Elimina lógicamente un cliente del directorio.
 * - Requiere permiso 'customers:delete' (reservado exclusivamente para owner).
 */
export async function DELETE(req: Request) {
  const auth = await requireApiPermission(req, 'customers:delete');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let userId: string | null = null;
  const url = new URL(req.url);
  userId = url.searchParams.get('userId')?.trim() || null;

  if (!userId) {
    try {
      const body = (await req.json()) as { userId?: string };
      userId = body.userId?.trim() || null;
    } catch {
      // Ignorar error de parsing si no hay body
    }
  }

  if (!userId) {
    return json({ error: 'El ID de cliente es obligatorio.' }, 400);
  }

  if (userId === auth.user.userId) {
    return forbiddenResponse('No podés eliminar tu propia cuenta.');
  }

  try {
    const deleted = await customersRepository.deleteCustomer(auth.context, userId);
    if (!deleted) {
      return notFoundResponse('Cliente no encontrado.');
    }
    return json({ ok: true });
  } catch (err) {
    console.error('Customer delete error:', err);
    return json({ error: 'No se pudo eliminar el cliente.' }, 500);
  }
}
