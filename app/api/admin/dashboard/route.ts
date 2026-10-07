import { requireApiPermission } from '../../../../lib/api-auth';
import { ordersRepository, tenantUsersRepository } from '../../../../lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Exige permiso para ver pedidos / métricas del tenant
  const auth = await requireApiPermission(req, 'orders:read');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  // 1. Consultar exclusivamente órdenes pertenecientes a este tenant
  const orders = await ordersRepository.getOrders(auth.context, 100);

  // 2. Consultar miembros pertenecientes a este tenant
  const tenantUsers = await tenantUsersRepository.getTenantUsers(auth.context);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total : 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  return Response.json(
    {
      totalRevenue,
      pendingOrders,
      users: tenantUsers.length,
      recentOrders: orders.slice(0, 5).map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        created_at: o.createdAt,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
