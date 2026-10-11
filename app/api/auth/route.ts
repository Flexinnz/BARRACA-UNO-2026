import {cookies} from 'next/headers';
import {authClient,authConfig,safeReturn,siteOrigin} from '../../../lib/supabase';
import {getChatGPTUser,getProviderUser} from '../../chatgpt-auth';
import {ensureAccount,accountEnabled} from '../../../lib/accounts';
import {createLocalUser,authenticateLocalUser,createSession,changeUserPassword,hasLocalCredentials,revokeUserSessions,SESSION_COOKIE_NAME} from '../../../lib/auth-local';
import {SESSION_TTL_SECONDS} from '../../../lib/jwt';
import {
  resolveTenantByRut,
  resolveTenantMembership,
  resolveTenantBySlug,
  normalizeRut,
} from '../../../lib/tenant-context';
import { isPlatformOwner, BOOTSTRAP_PLATFORM_OWNER_EMAILS } from '../../../lib/platform';
import { profileDb } from '../../../db/profiles';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
type CookieStore=Awaited<ReturnType<typeof cookies>>;
function setSessionCookie(store:CookieStore,token:string,secure:boolean){
  store.set(SESSION_COOKIE_NAME,token,{
    httpOnly:true,
    sameSite:'lax',
    path:'/',
    maxAge:SESSION_TTL_SECONDS,
    secure,
  });
}

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

  let input:{action?:string;email?:string;password?:string;name?:string;returnTo?:string;currentPassword?:string;newPassword?:string;company?:string;phone?:string;rut?:string;clientType?:string};
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
  if(['login','register','reset'].includes(action!)&&(!password||password.length>128||(action!=='login'&&password.length<10))){
    return json({error:'La contraseña debe tener al menos 10 caracteres.'},400);
  }

  try{
    if(action==='logout'){
      const store=await cookies();
      store.delete(SESSION_COOKIE_NAME);
      store.delete('dambru_tenant');
      store.delete('__sites_local_auth');
      if(authConfig()){
        try{
          const client=await authClient();
          await client.auth.signOut();
        }catch{}
      }
      return json({redirect:'/'});
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
      const company = typeof input.company === 'string' ? input.company.trim() : undefined;
      const phone = typeof input.phone === 'string' ? input.phone.trim() : undefined;
      const rut = typeof input.rut === 'string' ? input.rut.trim() : undefined;

      // If Supabase is active, use it
      if(authConfig()){
        const client=await authClient();
        const {data,error}=await client.auth.signUp({
          email,
          password,
          options:{
            data:{
              full_name:input.name.trim(),
              company: company || '',
              phone: phone || '',
              rut: rut || '',
            },
            emailRedirectTo:`${origin}/auth/callback`
          }
        });
        if(error)return json({error:error.status===429?'Demasiados intentos. Esperá unos minutos.':'No pudimos crear la cuenta. Revisá tus datos o probá iniciar sesión.'},error.status===429?429:400);
        if(!data.session)return json({message:'Revisá tu correo y confirmá la cuenta. Luego podrás iniciar sesión.'});
        const user=await getProviderUser();
        if(!user){await client.auth.signOut();return json({error:'Debés confirmar tu correo antes de entrar.'},403)}
        const account=await ensureAccount(user);
        if(!accountEnabled(account,user)){await client.auth.signOut();return json({error:'Esta cuenta está deshabilitada por la empresa.'},403)}
        setSessionCookie(await cookies(),await createSession(user.userId),origin.startsWith('https:'));
        return json({redirect:safeReturn(input.returnTo)});
      }

      // Native DB registration
      const user=await createLocalUser(input.name.trim(),email,password,company,phone,rut);
      const token=await createSession(user.userId);
      const store=await cookies();
      setSessionCookie(store,token,origin.startsWith('https:'));
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
        await revokeUserSessions(user.userId);
        setSessionCookie(await cookies(),await createSession(user.userId),origin.startsWith('https:'));
      }else{
        return json({error:'La recuperación por correo no está configurada.'},400);
      }
      return json({redirect:'/cuenta'});
    }

    if(action==='change-password'){
      const user=await getChatGPTUser();
      if(!user)return json({error:'Debés iniciar sesión para cambiar tu contraseña.'},401);
      const currentPassword=typeof input.currentPassword==='string'?input.currentPassword:'';
      const newPassword=typeof input.newPassword==='string'?input.newPassword:'';
      if(!currentPassword)return json({error:'Ingresá tu contraseña actual.'},400);
      if(!newPassword||newPassword.length<10||newPassword.length>128)return json({error:'La nueva contraseña debe tener entre 10 y 128 caracteres.'},400);
      if(currentPassword===newPassword)return json({error:'La nueva contraseña debe ser diferente a la actual.'},400);

      let changedWithProvider=false;
      if(authConfig()){
        const client=await authClient();
        const {error:signInError}=await client.auth.signInWithPassword({email:user.email,password:currentPassword});
        if(!signInError){
          const {error:updateError}=await client.auth.updateUser({password:newPassword});
          if(updateError)return json({error:'No pudimos cambiar la contraseña. Probá una contraseña diferente.'},400);
          changedWithProvider=true;
        }
      }

      if(await hasLocalCredentials(user.userId)){
        await changeUserPassword(user.userId,currentPassword,newPassword);
      }else if(changedWithProvider){
        await revokeUserSessions(user.userId);
      }else{
        return json({error:'La contraseña actual es incorrecta.'},400);
      }
      setSessionCookie(await cookies(),await createSession(user.userId),origin.startsWith('https:'));
      return json({ok:true,message:'Tu contraseña fue actualizada con éxito.'});
    }

    if(action==='login'){
      if(authConfig()){
        try{
          const client=await authClient();
          const {error}=await client.auth.signInWithPassword({email,password});
          if(!error){
            const user=await getProviderUser();
            if(user){
              const account=await ensureAccount(user);
              if(accountEnabled(account,user)){
                setSessionCookie(await cookies(),await createSession(user.userId),origin.startsWith('https:'));
                return json({redirect:safeReturn(input.returnTo)||'/admin'});
              }
            }
          }
        }catch{}
      }

      // 1. Validar credenciales de usuario en la base de datos
      const user = await authenticateLocalUser(email, password);
      const db = profileDb();

      // 2. Determinar si es Platform Owner de Dambru Solutions
      const normalizedEmail = user.email.toLowerCase();
      const isPlatformAdmin =
        BOOTSTRAP_PLATFORM_OWNER_EMAILS.includes(normalizedEmail) ||
        (await isPlatformOwner(user, db));

      const rawRut = typeof input.rut === 'string' ? input.rut.trim() : '';
      const cleanRut = normalizeRut(rawRut);

      let resolvedTenantSlug = 'barraca-uno';

      if (isPlatformAdmin) {
        // Platform Owners: conservan autoridad global sobre la plataforma
        // Si especifican un RUT, se resuelve ese tenant específico
        if (cleanRut) {
          const tenant = await resolveTenantByRut(cleanRut, db);
          if (!tenant) {
            return json({ error: 'Empresa no encontrada para el RUT ingresado.' }, 404);
          }
          if (tenant.status !== 'active') {
            return json({ error: 'La empresa se encuentra inactiva o suspendida.' }, 403);
          }
          resolvedTenantSlug = tenant.slug;
        } else {
          // Si no especifican RUT, resolver primer tenant activo o mantener el preferido
          const store = await cookies();
          const cookieTenant = store.get('dambru_tenant')?.value;
          if (cookieTenant) {
            const t = await resolveTenantBySlug(cookieTenant, db);
            if (t && t.status === 'active') {
              resolvedTenantSlug = t.slug;
            }
          }
        }
      } else {
        // Usuarios regulares y propietarios de tenant: EL RUT ES OBLIGATORIO
        if (!cleanRut) {
          return json({ error: 'Ingresá el RUT de la empresa para acceder.' }, 400);
        }

        const tenant = await resolveTenantByRut(cleanRut, db);
        if (!tenant) {
          return json({ error: 'Empresa no encontrada o RUT incorrecto.' }, 401);
        }

        if (tenant.status !== 'active') {
          return json({ error: 'La empresa se encuentra inactiva o suspendida.' }, 403);
        }

        // Comprobar membresía activa en el tenant identificado por el RUT
        const membership = await resolveTenantMembership(tenant.id, user.userId, db);
        if (!membership || membership.status !== 'active') {
          return json({ error: 'No posees una membresía activa en esta empresa.' }, 403);
        }

        resolvedTenantSlug = tenant.slug;
      }

      // 3. Crear sesión y cookies seguras
      const token = await createSession(user.userId);
      const store = await cookies();
      const isSecure = origin.startsWith('https:');
      setSessionCookie(store, token, isSecure);

      // Registrar tenant autorizado en cookie dambru_tenant
      store.set('dambru_tenant', resolvedTenantSlug, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
        secure: isSecure,
      });

      const returnUrl = safeReturn(input.returnTo);
      const targetRedirect = returnUrl && returnUrl !== '/' ? returnUrl : '/admin';
      return json({ redirect: targetRedirect });
    }

    return json({error:'Acción desconocida.'},400);
  }catch(e){
    console.error('Auth error',e);
    return json({error:e instanceof Error?e.message:'No pudimos procesar la solicitud.'},400);
  }
}
