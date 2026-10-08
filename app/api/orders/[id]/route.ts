import {
  requireApiPermission,
  getRequestTenantContext,
  notFoundResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from '../../../../lib/api-auth';
import { profileDb } from '../../../../db/profiles';
import { sendOrderStatusUpdatedEmail } from '../../../../lib/email';
import { isUserPlatformOrTenantAdmin } from '../../../../lib/tenant-context';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'approved', 'shipped', 'delivered', 'cancelled'];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const context = await getRequestTenantContext(req);
  if (!context || !context.user) {
    return unauthorizedResponse('No autenticado.');
  }

  const resolved = await Promise.resolve(params);
  const orderId = resolved?.id;
  if (!orderId) {
    return notFoundResponse('ID de pedido inválido.');
  }

  const db = profileDb();
  const tenantId = context.tenant.id;

  const order = await db
    .prepare('SELECT * FROM orders WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)')
    .bind(orderId.trim(), tenantId)
    .first<any>();

  if (!order) {
    return notFoundResponse('Orden no encontrada en esta organización.');
  }

  const isAdmin = await isUserPlatformOrTenantAdmin(context.user, context.tenant.slug);
  const canManage =
    isAdmin ||
    context.permissions.has('orders:manage') ||
    context.permissions.has('orders:read');

  if (!canManage && order.user_id !== context.user.userId) {
    return forbiddenResponse('Sin acceso a este pedido.');
  }

  const itemsRes = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .bind(order.id)
    .all<any>();

  const items = (itemsRes.results || []).map((i) => ({
    ...i,
    id: i.id,
    order_id: i.order_id,
    orderId: i.order_id,
    product_id: i.product_id,
    productId: i.product_id,
    product_name: i.product_name,
    productName: i.product_name,
    product_sku: i.product_sku,
    productSku: i.product_sku,
    product_unit: i.product_unit,
    productUnit: i.product_unit,
    quantity: i.quantity,
    unit_price: i.unit_price,
    unitPrice: i.unit_price,
    line_total: i.line_total,
    lineTotal: i.line_total,
  }));

  return Response.json({ order, items });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireApiPermission(req, 'orders:manage');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  const resolved = await Promise.resolve(params);
  const orderId = resolved?.id;
  if (!orderId) {
    return notFoundResponse('ID de pedido inválido.');
  }

  const body = (await req.json()) as { status?: string; notes?: string };
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: 'Estado inválido.' }, { status: 400 });
  }

  if (!body.status) {
    return Response.json({ error: 'Estado requerido.' }, { status: 400 });
  }

  const db = profileDb();
  const tenantId = auth.context.tenant.id;

  const order = await db
    .prepare('SELECT * FROM orders WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)')
    .bind(orderId.trim(), tenantId)
    .first<any>();

  if (!order) {
    return notFoundResponse('Orden no encontrada en esta organización.');
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)'
    )
    .bind(body.status, now, orderId.trim(), tenantId)
    .run();

  try {
    await sendOrderStatusUpdatedEmail({
      orderId: order.id,
      customerEmail: order.user_email || order.userEmail,
      customerName: order.user_name || order.userName || 'Cliente',
      newStatus: body.status,
    });
  } catch (e) {
    console.error('Error sending update email', e);
  }

  return Response.json({ ok: true });
}
