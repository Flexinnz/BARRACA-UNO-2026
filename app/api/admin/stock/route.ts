import {
  requireApiPermission,
  notFoundResponse,
} from '../../../../lib/api-auth';
import {
  productsRepository,
  stockRepository,
  type ProductRecord,
} from '../../../../lib/data';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function getProductsWithStock(context: any) {
  const [products, stockList] = await Promise.all([
    productsRepository.getProducts(context),
    stockRepository.getAllStock(context),
  ]);

  const stockMap = new Map<number, { quantity: number; version: number; updatedAt: string }>();
  for (const s of stockList) {
    stockMap.set(s.productId, {
      quantity: s.quantity,
      version: s.version,
      updatedAt: s.updatedAt,
    });
  }

  return products.map((p) => {
    const s = stockMap.get(p.id);
    return {
      ...p,
      stock: s ? s.quantity : 0,
      version: s ? s.version : 0,
      updatedAt: s ? s.updatedAt : p.updatedAt,
    };
  });
}

export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'stock:read');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  try {
    const [products, movementsRaw] = await Promise.all([
      getProductsWithStock(auth.context),
      stockRepository.getStockMovements(auth.context, 100),
    ]);

    const movements = (movementsRaw || []).map((m: any) => ({
      id: m.id,
      productId: m.productId ?? m.product_id,
      type: m.type,
      amount: m.amount,
      delta: m.delta,
      before: m.beforeQuantity ?? m.before ?? 0,
      beforeQuantity: m.beforeQuantity ?? m.before ?? 0,
      after: m.afterQuantity ?? m.after ?? 0,
      afterQuantity: m.afterQuantity ?? m.after ?? 0,
      reason: m.reason || '',
      reference: m.reference || '',
      actorId: m.actorId ?? m.actor_id ?? '',
      actorEmail: m.actorEmail ?? m.actor_email ?? '',
      actorName: m.actorName ?? (m.actorEmail ? m.actorEmail.split('@')[0] : 'Operador'),
      createdAt: m.createdAt ?? m.created_at ?? '',
    }));

    return json({ products, movements });
  } catch (e) {
    console.error('Stock administration read failed', e);
    return json({ error: 'No pudimos cargar el stock.' }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'stock:adjust');
  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response!;
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.productId !== 'number' ||
    !['receive', 'issue', 'count'].includes(String(input.type)) ||
    !Number.isSafeInteger(input.amount) ||
    Number(input.amount) < (input.type === 'count' ? 0 : 1) ||
    Number(input.amount) > 1000000 ||
    typeof input.reason !== 'string' ||
    !input.reason.trim()
  ) {
    return json({ error: 'Revisá material, cantidad y motivo.' }, 400);
  }

  const productId = Number(input.productId);
  const type = String(input.type);
  const amount = Number(input.amount);
  const reason = input.reason.trim();
  const reference = typeof input.reference === 'string' ? input.reference.trim() : '';

  try {
    // 1. Obtener producto dentro del tenant
    const product = await productsRepository.getProductById(auth.context, productId);
    if (!product) {
      return notFoundResponse('Material no encontrado en esta organización.');
    }

    // 2. Obtener existencias actuales dentro del tenant
    const currentStock = await stockRepository.getProductStock(auth.context, productId);
    const currentQty = currentStock ? currentStock.quantity : 0;
    const currentVersion = currentStock ? currentStock.version : 0;

    const next =
      type === 'receive'
        ? currentQty + amount
        : type === 'issue'
        ? currentQty - amount
        : amount;

    if (next < 0 || next > 1000000) {
      return json(
        { error: next < 0 ? 'La salida supera las existencias disponibles.' : 'El stock supera el máximo permitido.' },
        400
      );
    }

    if (next === currentQty) {
      return json({ error: 'La cantidad coincide con el stock actual. No hay cambio para registrar.' }, 400);
    }

    const delta = next - currentQty;

    // 3. Actualizar stock en el tenant
    await stockRepository.setProductStock(auth.context, productId, next);

    // 4. Registrar movimiento con actor autenticado inyectado por el servidor
    const movementId =
      typeof input.id === 'string' && input.id.trim()
        ? input.id.trim()
        : `sm_${crypto.randomUUID().replace(/-/g, '')}`;

    await stockRepository.recordStockMovement(auth.context, {
      id: movementId,
      productId,
      type,
      amount,
      delta,
      beforeQuantity: currentQty,
      afterQuantity: next,
      reason,
      reference,
      actorId: auth.user.userId,
      actorEmail: auth.user.email,
    });

    const [products, movementsRaw] = await Promise.all([
      getProductsWithStock(auth.context),
      stockRepository.getStockMovements(auth.context, 100),
    ]);

    const movements = (movementsRaw || []).map((m: any) => ({
      id: m.id,
      productId: m.productId ?? m.product_id,
      type: m.type,
      amount: m.amount,
      delta: m.delta,
      before: m.beforeQuantity ?? m.before ?? 0,
      beforeQuantity: m.beforeQuantity ?? m.before ?? 0,
      after: m.afterQuantity ?? m.after ?? 0,
      afterQuantity: m.afterQuantity ?? m.after ?? 0,
      reason: m.reason || '',
      reference: m.reference || '',
      actorId: m.actorId ?? m.actor_id ?? '',
      actorEmail: m.actorEmail ?? m.actor_email ?? '',
      actorName: m.actorName ?? (m.actorEmail ? m.actorEmail.split('@')[0] : 'Operador'),
      createdAt: m.createdAt ?? m.created_at ?? '',
    }));

    return json({ ok: true, products, movements });
  } catch (e) {
    console.error('Stock movement failed', e);
    return json({ error: 'No pudimos guardar el movimiento.' }, 503);
  }
}
