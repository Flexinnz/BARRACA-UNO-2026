import {getChatGPTUser} from '../../chatgpt-auth';
import {ensureAccount,accountEnabled,isCompanyAdmin} from '../../../lib/accounts';
import {profileDb} from '../../../db/profiles';
import {sendOrderConfirmationEmail} from '../../../lib/email';

export const dynamic='force-dynamic';

interface CartItem{productId:number;productName:string;productSku:string;productUnit:string;quantity:number;unitPrice:number}
interface CheckoutPayload{
  items:CartItem[];
  paymentMethod:string;
  shippingAddress:string;
  shippingCity:string;
  shippingPhone:string;
  notes:string;
  invoiceType?:string;
  rut?:string;
  companyName?:string;
}

export async function POST(req:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Necesitás iniciar sesión para hacer un pedido.'},{status:401});
  try{
    const account=await ensureAccount(user);
    if(!accountEnabled(account,user))return Response.json({error:'Tu cuenta está deshabilitada.'},{status:403});
  }catch{return Response.json({error:'Error al verificar la cuenta.'},{status:500});}

  let body:CheckoutPayload;
  try{body=await req.json() as CheckoutPayload;}
  catch{return Response.json({error:'Datos del pedido inválidos.'},{status:400});}

  const {items,paymentMethod,shippingAddress,shippingCity,shippingPhone,notes}=body;
  if(!items?.length)return Response.json({error:'El pedido no tiene productos.'},{status:400});
  if(!paymentMethod)return Response.json({error:'Seleccioná un método de pago.'},{status:400});
  if(!shippingAddress||!shippingCity||!shippingPhone)return Response.json({error:'Completá los datos de envío.'},{status:400});

  const db=profileDb();
  const now=new Date().toISOString();
  const orderId=`OC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  // Verify and decrement stock atomically
  for(const item of items){
    const row=await db.prepare('SELECT quantity,version FROM product_stock WHERE product_id=?').bind(item.productId).first<{quantity:number;version:number}>();
    if(!row)return Response.json({error:`Producto #${item.productId} no encontrado en el inventario.`},{status:400});
    if(row.quantity<item.quantity)return Response.json({error:`Stock insuficiente para "${item.productName}". Disponible: ${row.quantity}`},{status:409});
    const updated=await db.prepare('UPDATE product_stock SET quantity=quantity-?,version=version+1,updated_at=? WHERE product_id=? AND version=? AND quantity>=?')
      .bind(item.quantity,now,item.productId,row.version,item.quantity).run();
    if(!updated.meta.changes)return Response.json({error:`Conflicto de stock en "${item.productName}". Recargá el catálogo.`},{status:409});
  }

  const subtotal=items.reduce((s,i)=>s+i.unitPrice*i.quantity,0);
  const tax=Math.round(subtotal*0.22);
  const total=subtotal+tax;

  // Fetch user display name
  const profile=await db.prepare('SELECT display_name FROM profiles WHERE user_id=?').bind(user.userId).first<{display_name:string}>();
  const userName=profile?.display_name||user.email;

  // Create order
  const fiscalNote = body.rut ? `[Facturación DGI: RUT ${body.rut} - ${body.companyName || 'Empresa'}] ` : '';
  const finalNotes = (fiscalNote + (notes || '')).trim();

  // If user provided company/rut at checkout and doesn't have them in profile, update profile
  if (body.rut || body.companyName) {
    try {
      const bioRut = body.rut ? `RUT: ${body.rut}` : undefined;
      await db.prepare(`
        UPDATE profiles 
        SET company = CASE WHEN company IS NULL OR company = '' THEN ? ELSE company END,
            bio = CASE WHEN bio IS NULL OR bio = '' THEN ? ELSE bio END
        WHERE user_id = ?
      `).bind(body.companyName || '', bioRut || '', user.userId).run();
    } catch {}
  }

  await db.prepare('INSERT INTO orders (id,user_id,user_email,user_name,status,payment_method,shipping_address,shipping_city,shipping_phone,notes,subtotal,tax,total,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(orderId,user.userId,user.email,userName,'pending',paymentMethod,shippingAddress,shippingCity,shippingPhone,finalNotes,subtotal,tax,total,now,now).run();

  // Create order items
  for(const item of items){
    await db.prepare('INSERT INTO order_items (order_id,product_id,product_name,product_sku,product_unit,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?)')
      .bind(orderId,item.productId,item.productName,item.productSku,item.productUnit,item.quantity,item.unitPrice,item.unitPrice*item.quantity).run();
  }

  // Record stock movements
  for(const item of items){
    const mvId=`${orderId}-${item.productId}`;
    const after=await db.prepare('SELECT quantity FROM product_stock WHERE product_id=?').bind(item.productId).first<{quantity:number}>();
    await db.prepare('INSERT INTO stock_movements (id,product_id,type,amount,delta,before_quantity,after_quantity,reason,reference,actor_id,actor_email,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(mvId,item.productId,'out',item.quantity,-item.quantity,(after?.quantity??0)+item.quantity,after?.quantity??0,'Pedido de compra',orderId,user.userId,user.email,now).run();
  }

  // Send Email Notification via robust email module
  try {
    await sendOrderConfirmationEmail({
      orderId,
      customerEmail: user.email,
      customerName: userName,
      total,
      paymentMethod,
    });
  } catch (e) {
    console.error('Error sending order confirmation email:', e);
  }

  return Response.json({orderId,total},{status:201});
}

export async function GET(req:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'No autenticado.'},{status:401});
  const db=profileDb();
  const url=new URL(req.url);

  const singleId = url.searchParams.get('orderId');
  if (singleId) {
    const order = isCompanyAdmin(user)
      ? await db.prepare('SELECT * FROM orders WHERE id=?').bind(singleId).first()
      : await db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').bind(singleId, user.userId).first();
    if (!order) return Response.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id=?').bind(singleId).all();
    return Response.json({ order, items: items.results }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const all=url.searchParams.get('all')==='1'&&isCompanyAdmin(user);
  const query=all
    ?'SELECT o.*,GROUP_CONCAT(oi.product_name||" x"||oi.quantity,"|") AS items_summary FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200'
    :'SELECT o.*,GROUP_CONCAT(oi.product_name||" x"||oi.quantity,"|") AS items_summary FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100';
  const result=all
    ?await db.prepare(query).all()
    :await db.prepare(query).bind(user.userId).all();
  return Response.json({orders:result.results},{headers:{'Cache-Control':'no-store'}});
}
