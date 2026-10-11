import { requireApiPermission, notFoundResponse } from '../../../lib/api-auth';
import { productsRepository, stockRepository } from '../../../lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireApiPermission(req, 'products:read');

    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Consultar exclusivamente productos del tenant actual
    const [productsList, stockList] = await Promise.all([
      productsRepository.getProducts(auth.context),
      stockRepository.getAllStock(auth.context),
    ]);

    const stockMap = new Map<number, number>();
    for (const s of stockList) {
      stockMap.set(s.productId, s.quantity);
    }

    const products = productsList.map((p) => ({
      ...p,
      stock: stockMap.get(p.id) ?? 0,
    }));

    return Response.json({ products }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Stock read failed', e);
    return Response.json({ error: 'No pudimos consultar las existencias.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiPermission(req, 'products:write');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  try {
    const body = (await req.json()) as { products?: any[] };
    const products = body?.products;
    if (!Array.isArray(products)) {
      return Response.json({ error: 'Lista de productos inválida' }, { status: 400 });
    }

    for (const p of products) {
      if (typeof p.id === 'number' && p.id < 0) {
        // Nuevo producto: insertar usando estrictamente el tenant del contexto
        await productsRepository.createProduct(auth.context, {
          sku: String(p.sku || ''),
          name: String(p.name || ''),
          category: String(p.category || ''),
          price: Number(p.price || 0),
          tax: p.tax ? Number(p.tax) : 22,
          unit: p.unit ? String(p.unit) : 'unidad',
          imageSrc: p.imageSrc ? String(p.imageSrc) : '',
          description: p.description ? String(p.description) : '',
        });
      } else if (typeof p.id === 'number' && p.id >= 0) {
        // Producto existente: actualizar requiriendo (id AND tenant_id)
        await productsRepository.updateProduct(auth.context, p.id, {
          sku: p.sku !== undefined ? String(p.sku) : undefined,
          name: p.name !== undefined ? String(p.name) : undefined,
          category: p.category !== undefined ? String(p.category) : undefined,
          price: p.price !== undefined ? Number(p.price) : undefined,
          tax: p.tax !== undefined ? Number(p.tax) : undefined,
          unit: p.unit !== undefined ? String(p.unit) : undefined,
          imageSrc: p.imageSrc !== undefined ? String(p.imageSrc) : undefined,
          description: p.description !== undefined ? String(p.description) : undefined,
        });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('Failed to save products', e);
    return Response.json({ error: 'Failed to save products' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission(req, 'products:delete');
  if (!auth.authorized || !auth.context) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    if (!idStr) return Response.json({ error: 'ID required' }, { status: 400 });

    const id = parseInt(idStr, 10);
    if (isNaN(id)) return Response.json({ error: 'ID must be numeric' }, { status: 400 });

    const deleted = await productsRepository.deleteProduct(auth.context, id);
    if (!deleted) {
      return notFoundResponse('Producto no encontrado en esta organización.');
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('Failed to delete product', e);
    return Response.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
