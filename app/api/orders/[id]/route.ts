import {getChatGPTUser} from '../../../chatgpt-auth';
import {isCompanyAdmin} from '../../../../lib/accounts';
import {profileDb} from '../../../../db/profiles';
import { Resend } from 'resend';
export const dynamic='force-dynamic';

const VALID_STATUSES=['pending','approved','shipped','delivered','cancelled'];

export async function GET(req:Request,{params}:{params:{id:string}}){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'No autenticado.'},{status:401});
  const db=profileDb();
  const order=await db.prepare('SELECT * FROM orders WHERE id=?').bind(params.id).first();
  if(!order)return Response.json({error:'Orden no encontrada.'},{status:404});
  const typedOrder=order as {user_id:string};
  if(!isCompanyAdmin(user)&&typedOrder.user_id!==user.userId)return Response.json({error:'Sin acceso.'},{status:403});
  const items=await db.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY id').bind(params.id).all();
  return Response.json({order,items:items.results});
}

export async function PATCH(req:Request,{params}:{params:{id:string}}){
  const user=await getChatGPTUser();
  if(!user||!isCompanyAdmin(user))return Response.json({error:'Solo administradores pueden cambiar el estado de una orden.'},{status:403});
  const body=await req.json() as {status?:string;notes?:string};
  if(body.status&&!VALID_STATUSES.includes(body.status))return Response.json({error:'Estado inválido.'},{status:400});
  const db=profileDb();
  const now=new Date().toISOString();
  const updates:string[]=['updated_at=?'];
  const binds:unknown[]=[now];
  if(body.status){updates.push('status=?');binds.push(body.status);}
  if(typeof body.notes==='string'){updates.push('notes=?');binds.push(body.notes);}
  binds.push(params.id);
  await db.prepare(`UPDATE orders SET ${updates.join(',')} WHERE id=?`).bind(...binds).run();

  if (body.status && process.env.RESEND_API_KEY) {
    try {
      const orderUser = await db.prepare('SELECT user_email, user_name, total FROM orders WHERE id=?').bind(params.id).first<{user_email:string,user_name:string,total:number}>();
      if (orderUser) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const statusMap: Record<string, string> = { 'pending': 'Pendiente', 'approved': 'Aprobado y en preparación', 'shipped': 'En camino', 'delivered': 'Entregado', 'cancelled': 'Cancelado' };
        await resend.emails.send({
          from: 'Barraca Uno <ventas@barraca-uno.com>',
          to: orderUser.user_email,
          subject: `Actualización de pedido ${params.id} - Barraca Uno`,
          html: `<h2>Hola ${orderUser.user_name||''},</h2><p>Tu pedido <strong>${params.id}</strong> ha cambiado de estado.</p><p>Nuevo estado: <strong>${statusMap[body.status]||body.status}</strong></p><p>Ante cualquier consulta, respondé a este correo. ¡Gracias!</p>`
        });
      }
    } catch (e) { console.error('Error sending update email', e); }
  }

  return Response.json({ok:true});
}
