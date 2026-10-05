import {getChatGPTUser} from '../../../chatgpt-auth';
import {isCompanyAdmin} from '../../../../lib/accounts';
import {profileDb} from '../../../../db/profiles';
import {defaultProducts} from '../../../../lib/catalog';
import {readStock,readMovements,StockMovement} from '../../../../lib/stock';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Iniciá sesión.'},401);if(!isCompanyAdmin(user))return json({error:'Solo el administrador puede controlar stock.'},403);try{const [products,movements]=await Promise.all([readStock(),readMovements()]);return json({products,movements})}catch(e){console.error('Stock administration read failed',e);return json({error:'No pudimos cargar el stock.'},503)}}
export async function POST(request:Request){
 let raw='';const reader=request.body?.getReader();if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>4000){await reader.cancel();return json({error:'Solicitud demasiado grande.'},413)}raw+=decoder.decode(chunk.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}}
 const user=await getChatGPTUser();if(!user)return json({error:'Iniciá sesión.'},401);if(!isCompanyAdmin(user))return json({error:'Solo el administrador puede modificar stock.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin&&request.headers.get('origin')!=='https://barraca-uno-inventario.brunosaravia9.chatgpt.site'||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Origen no permitido.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Formato no permitido.'},415);
 let input:Record<string,unknown>;try{input=JSON.parse(raw)}catch{return json({error:'Solicitud inválida.'},400)}
 if(!input||typeof input!=='object'||!defaultProducts.some(p=>p.id===input.productId)||!['receive','issue','count'].includes(String(input.type))||!Number.isSafeInteger(input.amount)||Number(input.amount)<(input.type==='count'?0:1)||Number(input.amount)>1000000||!Number.isSafeInteger(input.version)||Number(input.version)<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>240||typeof input.reference!=='string'||input.reference.length>120||typeof input.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id))return json({error:'Revisá material, cantidad, motivo y referencia.'},400);
 const reason=input.reason.trim(),reference=input.reference.trim(),db=profileDb();
 const prior=()=>db.prepare('SELECT product_id AS productId,type,amount,reason,reference,actor_id AS actorId FROM stock_movements WHERE id=?').bind(input.id).first<StockMovement>();
 const replay=async(row:StockMovement)=>row.productId===input.productId&&row.type===input.type&&row.amount===input.amount&&row.reason===reason&&row.reference===reference&&row.actorId===user.userId?json({ok:true,replayed:true,products:await readStock()}):json({error:'La solicitud ya fue utilizada para otro movimiento.'},409);
 try{const previous=await prior();if(previous)return replay(previous);const current=await db.prepare('SELECT quantity,version FROM product_stock WHERE product_id=?').bind(input.productId).first<{quantity:number;version:number}>();if(!current)return json({error:'Material no encontrado.'},404);if(current.version!==input.version)return json({error:'El stock cambió. Actualizá las existencias antes de confirmar.'},409);
 const next=input.type==='receive'?current.quantity+Number(input.amount):input.type==='issue'?current.quantity-Number(input.amount):Number(input.amount);if(next<0||next>1000000)return json({error:next<0?'La salida supera las existencias disponibles.':'El stock supera el máximo permitido.'},400);if(next===current.quantity)return json({error:'La cantidad coincide con el stock actual. No hay cambio para registrar.'},400);
 const now=new Date().toISOString(),delta=next-current.quantity;
 const results=await db.batch([
 db.prepare('INSERT INTO stock_movements (id,product_id,type,amount,delta,before_quantity,after_quantity,reason,reference,actor_id,actor_email,created_at) SELECT ?,?,?,?,?,quantity,?,?,?,?,?,? FROM product_stock WHERE product_id=? AND version=?').bind(input.id,input.productId,input.type,input.amount,delta,next,reason,reference,user.userId,user.email,now,input.productId,input.version),
 db.prepare('UPDATE product_stock SET quantity=?,version=version+1,updated_at=? WHERE product_id=? AND version=? AND EXISTS(SELECT 1 FROM stock_movements WHERE id=?)').bind(next,now,input.productId,input.version,input.id)
 ]);if(!results[1].meta.changes){const previous=await prior();if(previous)return replay(previous);return json({error:'Otra persona modificó el stock. Actualizá y volvé a confirmar.'},409)}return json({ok:true,products:await readStock()});
 }catch(e){console.error('Stock movement failed',e);return json({error:'No pudimos guardar el movimiento. Podés reintentar sin duplicarlo.'},503)}
}
