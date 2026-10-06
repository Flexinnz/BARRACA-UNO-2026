import {getChatGPTUser} from '../../chatgpt-auth';
import {profileDb} from '../../../db/profiles';
import {ensureAccount,accountEnabled,isCompanyAdmin} from '../../../lib/accounts';
import {defaultProfile,validateProfile,UserProfile} from '../../../lib/profile';
import {sendEmail} from '../../../lib/email';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({authenticated:false,profile:null});
 try {const account=await ensureAccount(user);if(!accountEnabled(account,user))return json({error:account.status==='deleted'?'El administrador eliminó tu cuenta.':'Tu cuenta está bloqueada.',blocked:true},403);const row=await profileDb().prepare('SELECT display_name AS displayName, email, company, phone, bio, avatar, accent, theme, density, updated_at AS updatedAt FROM profiles WHERE user_id = ?').bind(user.userId).first<UserProfile>();
 return json({authenticated:true,isAdmin:isCompanyAdmin(user),profile:row?{...row,email:user.email}:{...defaultProfile,displayName:user.fullName??user.email.split('@')[0],email:user.email},saved:!!row});
 }catch(error){console.error('Profile read failed',error);return json({error:'No pudimos cargar tu perfil. Intentá nuevamente.'},503)}
}
export async function PUT(request:Request){
 let raw=''; const reader=request.body?.getReader(); if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>1000000){await reader.cancel();return json({error:'El perfil excede el tamaño permitido (máximo 1MB).'},413)}raw+=decoder.decode(chunk.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}}
 const user=await getChatGPTUser();if(!user)return json({error:'Iniciá sesión para guardar tu perfil.'},401);
 const origin=request.headers.get('origin');
 const allowedOrigin=origin&&(origin===new URL(request.url).origin||origin==='https://barraca-uno-inventario.brunosaravia9.chatgpt.site'||/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)||origin==='http://127.0.0.1:5173'||origin==='http://localhost:5173');
 if(!origin||!allowedOrigin)return json({error:'Origen no permitido.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Formato no permitido.'},415);
  let profile;try{profile=validateProfile(JSON.parse(raw))}catch(error){return json({error:error instanceof Error?error.message:'Revisá los datos ingresados.'},400)}
  const updatedAt=new Date().toISOString();
  try {
    const account=await ensureAccount(user);
    if(!accountEnabled(account,user))return json({error:'Tu cuenta no está habilitada.',blocked:true},403);
    
    const db = profileDb();
    const existing = await db.prepare('SELECT 1 FROM profiles WHERE user_id=?').bind(user.userId).first();
    const isNew = !existing;

    const result=await db.prepare('INSERT INTO profiles (user_id, email, display_name, company, phone, bio, avatar, accent, theme, density, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM accounts WHERE user_id=? AND (status=\'active\' OR ?=1)) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email, display_name=excluded.display_name, company=excluded.company, phone=excluded.phone, bio=excluded.bio, avatar=excluded.avatar, accent=excluded.accent, theme=excluded.theme, density=excluded.density, updated_at=excluded.updated_at').bind(user.userId,user.email,profile.displayName,profile.company,profile.phone,profile.bio,profile.avatar,profile.accent,profile.theme,profile.density,updatedAt,user.userId,isCompanyAdmin(user)?1:0).run();
    if(!result.meta.changes)return json({error:'Tu cuenta no está habilitada.',blocked:true},403);
    
    if (isNew) {
      try {
        await sendEmail({
          to: user.email,
          subject: '¡Bienvenido a Barraca Uno!',
          html: `<h2>¡Hola ${profile.displayName}!</h2><p>Te damos la bienvenida a tu espacio en <strong>Barraca Uno</strong>.</p><p>Tu cuenta ha sido activada exitosamente con el correo ${user.email}. Ya podés navegar nuestro catálogo, armar presupuestos y gestionar tus compras de obra.</p><p>¡Gracias por elegirnos!</p>`,
        });
      } catch (e) { console.error('Error sending welcome email', e); }
    }

    return json({profile:{...profile,email:user.email,updatedAt},saved:true})
  } catch(error) { console.error('Profile save failed',error);return json({error:'No pudimos guardar el perfil. Tus cambios siguen en el formulario.'},503) }
}


