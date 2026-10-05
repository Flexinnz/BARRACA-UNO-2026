import {cookies} from 'next/headers';
import {authClient,authConfig,safeReturn,siteOrigin} from '../../../lib/supabase';
import {getChatGPTUser} from '../../chatgpt-auth';
import {ensureAccount,accountEnabled} from '../../../lib/accounts';
import {createLocalUser,authenticateLocalUser,createSession,deleteSession,changeUserPassword,SESSION_COOKIE_NAME} from '../../../lib/auth-local';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(request:Request){
  let raw='';
  const reader=request.body?.getReader();
  if(reader){
    let size=0;
    const decoder=new TextDecoder();
    try{
      while(true){
        const part=await reader.read();
        if(part.done)break;
        size+=part.value.byteLength;
        if(size>4096){
          await reader.cancel();
          return json({error:'Solicitud demasiado grande.'},413);
        }
        raw+=decoder.decode(part.value,{stream:true});
      }
      raw+=decoder.decode();
    }finally{
      reader.releaseLock();
    }
  }

  const origin=request.headers.get('origin');
  const allowedOrigin=origin&&(
    origin===new URL(request.url).origin||
    origin===siteOrigin||
    /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)||
    origin==='http://127.0.0.1:5173'||
    origin==='http://localhost:5173'
  );
  if(!origin||!allowedOrigin){
    return json({error:'Origen no permitido.'},403);
  }
  if(!request.headers.get('content-type')?.includes('application/json')){
    return json({error:'Formato no permitido.'},415);
  }

  let input:{action?:string;email?:string;password?:string;name?:string;returnTo?:string;currentPassword?:string;newPassword?:string};
  try{
    input=JSON.parse(raw);
  }catch{
    return json({error:'Solicitud inválida.'},400);
  }

  if(!input||!['login','register','recover','reset','logout','change-password'].includes(input.action??'')){
    return json({error:'Acción inválida.'},400);
  }

  const action=input.action,
        email=typeof input.email==='string'?input.email.trim().toLowerCase():'',
        password=typeof input.password==='string'?input.password:'';

  if(!['reset','logout','change-password'].includes(action!)&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)){
    return json({error:'Ingresá un correo válido.'},400);
  }
  if(['login','register','reset'].includes(action!)&&(!password||password.length>128||(action!=='login'&&password.length<6))){
    return json({error:'La contraseña debe tener al menos 6 caracteres.'},400);
  }

  try{
    if(action==='logout'){
      const store=await cookies();
      const token=store.get(SESSION_COOKIE_NAME)?.value;
      if(token)await deleteSession(token);
      store.delete(SESSION_COOKIE_NAME);
      store.delete('__sites_local_auth');
      if(authConfig()){
        try{
          const client=await authClient();
          await client.auth.signOut();
        }catch{}
      }
      return json({redirect:'/ingresar'});
    }

    if(action==='recover'){
      if(authConfig()){
        const client=await authClient();
        const store=await cookies();
        store.set('barraca-auth-next','/ingresar?mode=reset',{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),path:'/auth/callback',maxAge:3600});
        await client.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback`});
        return json({message:'Si el correo está registrado, recibirás un enlace. Revisá también la carpeta de spam.'});
      }
      return json({message:'Para recuperar tu contraseña comunicate con el administrador o creá una nueva cuenta.'});
    }

    if(action==='register'){
      if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80){
        return json({error:'Ingresá tu nombre.'},400);
      }
      // If Supabase is active, use it
      if(authConfig()){
        const client=await authClient();
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:input.name.trim()},emailRedirectTo:`${origin}/auth/callback`}});
        if(error)return json({error:error.status===429?'Demasiados intentos. Esperá unos minutos.':'No pudimos crear la cuenta. Revisá tus datos o probá iniciar sesión.'},error.status===429?429:400);
        if(!data.session)return json({message:'Revisá tu correo y confirmá la cuenta. Luego podrás iniciar sesión.'});
        const user=await getChatGPTUser();
        if(!user){await client.auth.signOut();return json({error:'Debés confirmar tu correo antes de entrar.'},403)}
        const account=await ensureAccount(user);
        if(!accountEnabled(account,user)){await client.auth.signOut();return json({error:'Esta cuenta está deshabilitada por la empresa.'},403)}
        return json({redirect:safeReturn(input.returnTo)});
      }

      // Native DB registration
      const user=await createLocalUser(input.name.trim(),email,password);
      const token=await createSession(user.userId);
      const store=await cookies();
      store.set(SESSION_COOKIE_NAME,token,{
        httpOnly:true,
        sameSite:'lax',
        path:'/',
        maxAge:30*24*60*60,
        secure:origin.startsWith('https:'),
      });
      return json({redirect:safeReturn(input.returnTo)||'/'});
    }

    if(action==='reset'){
      const user=await getChatGPTUser();
      if(!user)return json({error:'El enlace venció. Solicitá otro enlace de recuperación.'},401);
      const account=await ensureAccount(user);
      if(!accountEnabled(account,user))return json({error:'Esta cuenta está deshabilitada.'},403);
      if(authConfig()){
        const client=await authClient();
        const {error}=await client.auth.updateUser({password});
        if(error)return json({error:'No pudimos cambiar la contraseña. Probá una contraseña diferente.'},400);
      }
      return json({redirect:'/cuenta'});
    }

    if(action==='change-password'){
      const user=await getChatGPTUser();
      if(!user)return json({error:'Debés iniciar sesión para cambiar tu contraseña.'},401);
      const currentPassword=typeof input.currentPassword==='string'?input.currentPassword:'';
      const newPassword=typeof input.newPassword==='string'?input.newPassword:'';
      if(!currentPassword)return json({error:'Ingresá tu contraseña actual.'},400);
      if(!newPassword||newPassword.length<6||newPassword.length>128)return json({error:'La nueva contraseña debe tener entre 6 y 128 caracteres.'},400);
      if(currentPassword===newPassword)return json({error:'La nueva contraseña debe ser diferente a la actual.'},400);

      if(authConfig()){
        try{
          const client=await authClient();
          await client.auth.updateUser({password:newPassword});
        }catch(e){
          console.warn('Supabase password update failed',e);
        }
      }

      await changeUserPassword(user.userId,currentPassword,newPassword);
      return json({ok:true,message:'Tu contraseña fue actualizada con éxito.'});
    }

    if(action==='login'){
      if(authConfig()){
        try{
          const client=await authClient();
          const {error}=await client.auth.signInWithPassword({email,password});
          if(!error){
            const user=await getChatGPTUser();
            if(user){
              const account=await ensureAccount(user);
              if(accountEnabled(account,user)){
                return json({redirect:safeReturn(input.returnTo)||'/'});
              }
            }
          }
        }catch{}
      }

      // Native DB login
      const user=await authenticateLocalUser(email,password);
      const token=await createSession(user.userId);
      const store=await cookies();
      store.set(SESSION_COOKIE_NAME,token,{
        httpOnly:true,
        sameSite:'lax',
        path:'/',
        maxAge:30*24*60*60,
        secure:origin.startsWith('https:'),
      });
      return json({redirect:safeReturn(input.returnTo)||'/'});
    }

    return json({error:'Acción desconocida.'},400);
  }catch(e){
    console.error('Auth error',e);
    return json({error:e instanceof Error?e.message:'No pudimos procesar la solicitud.'},400);
  }
}
