import {
  requireApiPermission,
  getRequestTenantContext,
  notFoundResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from '../../../lib/api-auth';
import {
  ordersRepository,
  stockRepository,
  type NewOrderItemInput,
} from '../../../lib/data';
import { sendOrderConfirmationEmail } from '../../../lib/email';
import { profileDb } from '../../../db/profiles';
import { isUserPlatformOrTenantAdmin } from '../../../lib/tenant-context';

export const dynamic = 'force-dynamic';

interface CartItem {
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
}

interface CheckoutPayload {
  items: CartItem[];
  paymentMethod: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  notes: string;
  invoiceType?: string;
  rut?: string;
  companyName?: string;
}

export async function POST(req: Request) {
  const context = await getRequestTenantContext(req);
  if (!context || !context.user) {
    return unauthorizedResponse('Necesitás iniciar sesión para hacer un pedido.');
  }

  let body: CheckoutPayload;
  try {
    body = (await req.json()) as CheckoutPayload;
  } catch {
    return Response.json({ error: 'Datos del pedido inválidos.' }, { status: 400 });
  }

  const { items, paymentMethod, shippingAddress, shippingCity, shippingPhone, notes } = body;
  if (!items?.length) return Response.json({ error: 'El pedido no tiene productos.' }, { status: 400 });
  if (!paymentMethod) return Response.json({ error: 'Seleccioná un método de pago.' }, { status: 400 });
  if (!shippingAddress || !shippingCity || !shippingPhone) {
    return Response.json({ error: 'Completá los datos de envío.' }, { status: 400 });
  }

  // 1. Verificar y decrementar stock de cada ítem de forma segura y tenant-scoped
  for (const item of items) {
    const currentStock = await stockRepository.getProductStock(context, item.productId);
    if (!currentStock) {
      return Response.json(
        { error: `Producto #${item.productId} no encontrado en el inventario.` },
        { status: 400 }
      );
    }
    if (currentStock.quantity < item.quantity) {
      return Response.json(
        { error: `Stock insuficiente para "${item.productName}". Disponible: ${currentStock.quantity}` },
        { status: 409 }
      );
    }

    const decremented = await stockRepository.decrementProductStock(
      context,
      item.productId,
      item.quantity,
      currentStock.version
    );
    if (!decremented) {
      return Response.json(
        { error: `Conflicto de stock en "${item.productName}". Recargá el catálogo.` },
        { status: 409 }
      );
    }
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax = Math.round(subtotal * 0.22);
  const total = subtotal + tax;

  const fiscalNote = body.rut ? `[Facturación DGI: RUT ${body.rut} - ${body.companyName || 'Empresa'}] ` : '';
  const finalNotes = (fiscalNote + (notes || '')).trim();

  // Nombre para mostrar
  const userName = context.user.fullName || context.user.displayName || context.user.email;

  // 2. Crear pedido mediante Secure Data Layer (inyecta estrictamente tenant_id)
  const orderItemsInput: NewOrderItemInput[] = items.map((i) => ({
    productId: i.productId,
    productName: i.productName,
    productSku: i.productSku,
    productUnit: i.productUnit,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.unitPrice * i.quantity,
  }));

  const orderId = await ordersRepository.createOrder(
    context,
    {
      userId: context.user.userId,
      userEmail: context.user.email,
      userName,
      status: 'pending',
      paymentMethod,
      shippingAddress,
      shippingCity,
      shippingPhone,
      notes: finalNotes,
      subtotal,
      tax,
      total,
    },
    orderItemsInput
  );

  // 3. Registrar movimientos de stock con actor autenticado y tenantId del contexto
  for (const item of items) {
    const afterStock = await stockRepository.getProductStock(context, item.productId);
    const afterQty = afterStock?.quantity ?? 0;
    await stockRepository.recordStockMovement(context, {
      productId: item.productId,
      type: 'out',
      amount: item.quantity,
      delta: -item.quantity,
      beforeQuantity: afterQty + item.quantity,
      afterQuantity: afterQty,
      reason: 'Pedido de compra',
      reference: orderId,
      actorId: context.user.userId,
      actorEmail: context.user.email,
    });
  }

  // 4. Notificación por email
  try {
    await sendOrderConfirmationEmail({
      orderId,
      customerEmail: context.user.email,
      customerName: userName,
      customerPhone: shippingPhone,
      customerDocument: body.rut,
      total,
      subtotal,
      tax,
      paymentMethod,
      items: items.map((i) => ({
        name: i.productName,
        sku: i.productSku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.unitPrice * i.quantity,
      })),
      shippingAddress: shippingAddress + ' - ' + shippingCity,
      invoiceType: body.invoiceType,
    });
  } catch (e) {
    console.error('Error sending order confirmation email:', e);
  }

  return Response.json({ orderId, total }, { status: 201 });
}

export async function GET(req: Request) {
  const context = await getRequestTenantContext(req);
  if (!context || !context.user) {
    return unauthorizedResponse('No autenticado.');
  }

  const url = new URL(req.url);
  const singleId = url.searchParams.get('orderId');
  const db = profileDb();
  const tenantId = context.tenant.id;

  // Consulta de un pedido específico por ID
  if (singleId) {
    const order = await db
      .prepare(
        'SELECT * FROM orders WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)'
      )
      .bind(singleId.trim(), tenantId)
      .first<any>();

    if (!order) {
      return notFoundResponse('Pedido no encontrado en esta organización.');
    }

    const isAdmin = await isUserPlatformOrTenantAdmin(context.user, context.tenant.slug);
    const canManageOrders =
      isAdmin ||
      context.permissions.has('orders:manage') ||
      context.permissions.has('orders:read');

    if (!canManageOrders && order.user_id !== context.user.userId) {
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

    return Response.json(
      { order, items },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const isAll = url.searchParams.get('all') === '1';
  const isAdmin = await isUserPlatformOrTenantAdmin(context.user, context.tenant.slug);
  const canReadOrders =
    isAdmin ||
    context.permissions.has('orders:read') ||
    context.permissions.has('orders:manage');

  if (isAll) {
    if (!canReadOrders) {
      return forbiddenResponse('Solo personal autorizado puede listar todos los pedidos.');
    }

    const query = `
      SELECT o.*, GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, '|') AS items_summary
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.tenant_id IS NULL)
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 200
    `;
    const res = await db.prepare(query).bind(tenantId).all<any>();
    const orders = (res.results || []).map((row) => ({
      ...row,
      id: row.id,
      user_id: row.user_id,
      userId: row.user_id,
      user_email: row.user_email,
      userEmail: row.user_email,
      user_name: row.user_name,
      userName: row.user_name,
      status: row.status,
      payment_method: row.payment_method,
      paymentMethod: row.payment_method,
      shipping_address: row.shipping_address,
      shippingAddress: row.shipping_address,
      shipping_city: row.shipping_city,
      shippingCity: row.shipping_city,
      shipping_phone: row.shipping_phone,
      shippingPhone: row.shipping_phone,
      notes: row.notes,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      created_at: row.created_at,
      createdAt: row.created_at,
      updated_at: row.updated_at,
      updatedAt: row.updated_at,
      items_summary: row.items_summary || '',
      itemsSummary: row.items_summary || '',
    }));

    return Response.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Pedidos del usuario actual dentro de este tenant
  const userQuery = `
    SELECT o.*, GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, '|') AS items_summary
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE (o.tenant_id = ? OR o.tenant_id IS NULL) AND o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `;
  const res = await db.prepare(userQuery).bind(tenantId, context.user.userId).all<any>();
  const userOrders = (res.results || []).map((row) => ({
    ...row,
    id: row.id,
    user_id: row.user_id,
    userId: row.user_id,
    user_email: row.user_email,
    userEmail: row.user_email,
    user_name: row.user_name,
    userName: row.user_name,
    status: row.status,
    payment_method: row.payment_method,
    paymentMethod: row.payment_method,
    shipping_address: row.shipping_address,
    shippingAddress: row.shipping_address,
    shipping_city: row.shipping_city,
    shippingCity: row.shipping_city,
    shipping_phone: row.shipping_phone,
    shippingPhone: row.shipping_phone,
    notes: row.notes,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
    items_summary: row.items_summary || '',
    itemsSummary: row.items_summary || '',
  }));

  return Response.json({ orders: userOrders }, { headers: { 'Cache-Control': 'no-store' } });
}
