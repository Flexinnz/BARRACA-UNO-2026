import {
  requireApiPermission,
  getRequestTenantContext,
  notFoundResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from '../../../../lib/api-auth';
import { ordersRepository } from '../../../../lib/data';
import { sendOrderStatusUpdatedEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'shipped', 'delivered', 'cancelled'];

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const context = await getRequestTenantContext(req);
  if (!context || !context.user) {
    return unauthorizedResponse('No autenticado.');
  }

  const orderWithItems = await ordersRepository.getOrderById(context, params.id);
  if (!orderWithItems) {
    return notFoundResponse('Orden no encontrada en esta organización.');
  }

  const canManage = context.permissions.has('orders:manage');
  if (!canManage && orderWithItems.userId !== context.user.userId) {
    return forbiddenResponse('Sin acceso a este pedido.');
  }

  const { items, ...order } = orderWithItems;
  return Response.json({ order, items });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission(req, 'orders:manage');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  const body = (await req.json()) as { status?: string; notes?: string };
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: 'Estado inválido.' }, { status: 400 });
  }

  if (!body.status) {
    return Response.json({ error: 'Estado requerido.' }, { status: 400 });
  }

  const order = await ordersRepository.getOrderById(auth.context, params.id);
  if (!order) {
    return notFoundResponse('Orden no encontrada en esta organización.');
  }

  const updated = await ordersRepository.updateOrderStatus(auth.context, params.id, body.status);
  if (!updated) {
    return notFoundResponse('Orden no encontrada en esta organización.');
  }

  try {
    await sendOrderStatusUpdatedEmail({
      orderId: params.id,
      customerEmail: order.userEmail,
      customerName: order.userName || 'Cliente',
      newStatus: body.status,
    });
  } catch (e) {
    console.error('Error sending update email', e);
  }

  return Response.json({ ok: true });
}
