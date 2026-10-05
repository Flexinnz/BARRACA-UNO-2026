"use client";
import {BrandLogo} from './brand-art';
import {useEffect,useState} from 'react';
import {Moon,Sun,Monitor,Save,CheckCircle2,UserRound,LogIn,ArrowLeft,RefreshCw,ShieldCheck,Camera,KeyRound} from 'lucide-react';
import {UserProfile,Theme,avatars,avatarSymbols,accents,defaultProfile} from '../lib/profile';
const localThemeKey='barraca-uno-theme';
function applyTheme(theme:Theme){document.documentElement.dataset.theme=theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;document.documentElement.style.colorScheme=document.documentElement.dataset.theme;}
export function useTheme(){const [theme,setThemeState]=useState<Theme>('dark');useEffect(()=>{let value:Theme='dark';try{const stored=localStorage.getItem(localThemeKey);if(['light','dark','system'].includes(stored??''))value=stored as Theme}catch{}setThemeState(value);applyTheme(value);const sync=(event:Event)=>{const next=(event as CustomEvent<Theme>).detail;setThemeState(next);applyTheme(next)};window.addEventListener('barraca-theme',sync);return()=>window.removeEventListener('barraca-theme',sync)},[]);useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const change=()=>{if(theme==='system')applyTheme(theme)};media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[theme]);const setTheme=(value:Theme)=>{setThemeState(value);applyTheme(value);try{localStorage.setItem(localThemeKey,value)}catch{}};return {theme,setTheme};}
export function applyProfile(profile:UserProfile){document.documentElement.dataset.accent=profile.accent;document.documentElement.dataset.density=profile.density;}
export function useAccount(){const [profile,setProfile]=useState<UserProfile|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[authenticated,setAuthenticated]=useState(false),[saved,setSaved]=useState(false),[isAdmin,setIsAdmin]=useState(false);const load=async()=>{setLoading(true);setError('');try{const response=await fetch('/api/profile',{cache:'no-store'});const data=await response.json() as {error?:string;authenticated:boolean;profile:UserProfile;saved:boolean;isAdmin?:boolean};if(!response.ok)throw Error(data.error||'No pudimos cargar tu cuenta.');setAuthenticated(data.authenticated);setIsAdmin(!!data.isAdmin);setProfile(data.profile);setSaved(data.saved);if(data.profile){applyProfile(data.profile);try{if(!localStorage.getItem(localThemeKey)){localStorage.setItem(localThemeKey,data.profile.theme);applyTheme(data.profile.theme);window.dispatchEvent(new CustomEvent('barraca-theme',{detail:data.profile.theme}))}}catch{}}}catch(e){setError(e instanceof Error?e.message:'No pudimos cargar tu cuenta.')}finally{setLoading(false)}};useEffect(()=>{void load()},[]);const save=async(value:UserProfile)=>{const response=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await response.json() as {error?:string;authenticated:boolean;profile:UserProfile;saved:boolean;isAdmin?:boolean};if(!response.ok)throw Error(data.error||'No pudimos guardar el perfil.');setProfile(data.profile);setSaved(true);applyProfile(data.profile);return data.profile as UserProfile};return {profile,loading,error,authenticated,saved,isAdmin,load,save};}
export type Account=ReturnType<typeof useAccount>;
export function Avatar({profile,className=''}:{profile:UserProfile|null;className?:string}){
  if(profile?.avatar&&(profile.avatar.startsWith('data:image/')||profile.avatar.startsWith('http://')||profile.avatar.startsWith('https://')||profile.avatar.startsWith('/'))){
    return <span className={`user-avatar ${className} with-image accent-${profile?.accent??'ocean'}`} aria-label={`Foto de perfil de ${profile?.displayName||'usuario'}`}><img src={profile.avatar} alt={profile?.displayName||'Perfil'} className="avatar-img"/></span>;
  }
  const initials=(profile?.displayName||'').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'?';
  return <span className={`user-avatar ${className} accent-${profile?.accent??'ocean'}`} aria-label={`Avatar de ${profile?.displayName||'usuario'}`}>{profile?.avatar&&profile.avatar!=='initials'?avatarSymbols[profile.avatar]:initials}</span>;
}
export function ThemeButton({theme,setTheme}:{theme:Theme;setTheme:(t:Theme)=>void}){const Icon=theme==='dark'?Moon:theme==='light'?Sun:Monitor;return <button className="theme-button" aria-label={`Tema ${theme==='dark'?'oscuro':theme==='light'?'claro':'automático'}. Cambiar tema`} title="Cambiar claro / oscuro" onClick={()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')}><Icon size={20}/></button>}
function handleImageUpload(file:File,onDone:(dataUrl:string)=>void){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const size=160;
      canvas.width=size;
      canvas.height=size;
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      const minDim=Math.min(img.width,img.height);
      const sx=(img.width-minDim)/2;
      const sy=(img.height-minDim)/2;
      ctx.drawImage(img,sx,sy,minDim,minDim,0,0,size,size);
      onDone(canvas.toDataURL('image/jpeg',0.82));
    };
    img.src=e.target?.result as string;
  };
  reader.readAsDataURL(file);
}
export function ProfileEditor({account,theme,setTheme}:{account:Account;theme:Theme;setTheme:(t:Theme)=>void}){
  const [draft,setDraft]=useState<UserProfile>(()=>({...account.profile??defaultProfile,theme})),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [currentPwd,setCurrentPwd]=useState(''),[newPwd,setNewPwd]=useState(''),[confirmPwd,setConfirmPwd]=useState(''),[pwdSaving,setPwdSaving]=useState(false),[pwdMessage,setPwdMessage]=useState(''),[pwdError,setPwdError]=useState('');
  const change=(key:keyof UserProfile,value:string)=>{setDraft(old=>({...old,[key]:value}));setMessage('');setError('')};
  const handlePasswordChange=async(e:React.FormEvent)=>{
    e.preventDefault();
    setPwdError('');
    setPwdMessage('');
    if(newPwd.length<10){setPwdError('La nueva contraseña debe tener al menos 10 caracteres.');return}
    if(newPwd!==confirmPwd){setPwdError('Las contraseñas nuevas no coinciden.');return}
    setPwdSaving(true);
    try{
      const res=await fetch('/api/auth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'change-password',currentPassword:currentPwd,newPassword:newPwd})
      });
      const data=await res.json() as {ok?:boolean;error?:string;message?:string};
      if(!res.ok)throw new Error(data.error||'No pudimos actualizar la contraseña.');
      setPwdMessage('✓ Contraseña actualizada correctamente.');
      setCurrentPwd('');setNewPwd('');setConfirmPwd('');
    }catch(err){
      setPwdError(err instanceof Error?err.message:'Error al cambiar contraseña');
    }finally{
      setPwdSaving(false);
    }
  };
  return <div className="profile-editor-container"><form className="profile-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');setMessage('');try{await account.save(draft);setTheme(draft.theme);setMessage('Perfil guardado. Tus preferencias están sincronizadas.')}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar tus cambios.')}finally{setSaving(false)}}}>
<div className="profile-preview"><Avatar profile={draft} className="large"/><div><strong>{draft.displayName||'Tu nombre'}</strong><span>{draft.company||'Tu espacio en Barraca Uno'}</span><small>{draft.email}</small></div><span className="account-tag"><ShieldCheck size={13}/>Cuenta activa</span></div>
<div className="profile-section"><h3>Tu información</h3><div className="profile-fields"><label>Nombre visible<input autoComplete="name" required maxLength={80} value={draft.displayName} onChange={e=>change('displayName',e.target.value)}/></label><label>Empresa o equipo<input autoComplete="organization" maxLength={100} placeholder="Ej. Constructora del Sur" value={draft.company} onChange={e=>change('company',e.target.value)}/></label><label>Teléfono<input type="tel" autoComplete="tel" maxLength={30} placeholder="+598 99 123 456" value={draft.phone} onChange={e=>change('phone',e.target.value)}/></label><label>Correo electrónico<input value={draft.email} readOnly/><small>Correo de acceso a tu cuenta.</small></label><label className="full">Sobre vos<textarea rows={3} maxLength={280} placeholder="Tu rol, tu equipo o las obras en las que trabajás." value={draft.bio} onChange={e=>change('bio',e.target.value)}/><small>{draft.bio.length}/280 caracteres</small></label></div></div>
<div className="profile-section"><h3>Foto y estilo</h3><fieldset><legend>Foto de perfil</legend><div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginBottom:'14px'}}><label className="primary" style={{cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'7px',padding:'7px 14px',borderRadius:'5px',fontSize:'13px'}}><Camera size={16}/> Subir foto desde tu dispositivo<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleImageUpload(f,url=>change('avatar',url))}}/></label>{draft.avatar&&(draft.avatar.startsWith('data:image/')||draft.avatar.startsWith('http'))&&<button type="button" className="secondary" style={{padding:'7px 13px',fontSize:'13px'}} onClick={()=>change('avatar','initials')}>Quitar foto</button>}</div><div className="avatar-options">{avatars.map(a=><button type="button" key={a} className={draft.avatar===a?'selected':''} aria-label={`Avatar ${a==='initials'?'iniciales':a==='builder'?'constructor':a==='helmet'?'casco':a==='house'?'casa':'herramientas'}`} aria-pressed={draft.avatar===a} onClick={()=>change('avatar',a)}>{a==='initials'?<UserRound size={21}/>:avatarSymbols[a]}</button>)}</div></fieldset><fieldset><legend>Color de acento</legend><div className="accent-options">{accents.map((a,i)=><button type="button" className={`accent-choice accent-${a} ${draft.accent===a?'selected':''}`} key={a} aria-pressed={draft.accent===a} onClick={()=>change('accent',a)}><span/>{['Azul barraca','Celeste','Cobre','Bosque'][i]}{draft.accent===a&&<CheckCircle2 size={13}/>}</button>)}</div></fieldset><div className="profile-fields"><label>Tema<select value={draft.theme} onChange={e=>{change('theme',e.target.value);setTheme(e.target.value as Theme)}}><option value="dark">Oscuro</option><option value="light">Claro</option><option value="system">Seguir al sistema</option></select><small>Se aplica al instante en este dispositivo.</small></label><label>Densidad del catálogo<select value={draft.density} onChange={e=>change('density',e.target.value)}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label></div></div>
<div className="profile-save"><div role="status" aria-live="polite">{message&&<span className="save-success"><CheckCircle2 size={16}/>{message}</span>}{error&&<span className="save-error">{error}</span>}{!error&&!message&&<small>Guardado en tu cuenta, disponible al volver a entrar.</small>}</div><button className="primary" disabled={saving} type="submit"><Save size={17}/>{saving?'Guardando…':'Guardar perfil'}</button></div></form>
<div className="profile-section" style={{marginTop:'26px',borderTop:'1px solid var(--border)',paddingTop:'22px'}}><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}><KeyRound size={18} className="text-amber"/><h3 style={{margin:0}}>Seguridad y Contraseña</h3></div><p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'14px'}}>Cambiá tu contraseña de acceso cuando lo desees.</p><form onSubmit={handlePasswordChange}><div className="profile-fields"><label>Contraseña actual<input type="password" required autoComplete="current-password" value={currentPwd} onChange={e=>setCurrentPwd(e.target.value)} placeholder="Tu contraseña actual"/></label><label>Nueva contraseña<input type="password" required minLength={6} autoComplete="new-password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres"/></label><label>Confirmar nueva contraseña<input type="password" required minLength={6} autoComplete="new-password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="Repetir nueva contraseña"/></label></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'14px',flexWrap:'wrap',gap:'10px'}}><div>{pwdMessage&&<span className="save-success"><CheckCircle2 size={15}/>{pwdMessage}</span>}{pwdError&&<span className="save-error">{pwdError}</span>}</div><button type="submit" className="secondary" disabled={pwdSaving||!currentPwd||!newPwd} style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><KeyRound size={15}/>{pwdSaving?'Actualizando…':'Cambiar contraseña'}</button></div></form></div></div>}
export function AccountContent({account,theme,setTheme,signInHref='/cuenta'}:{account:Account;theme:Theme;setTheme:(t:Theme)=>void;signInHref?:string}){if(account.loading)return <div className="account-loading" role="status">Cargando tu cuenta…</div>;if(account.error)return <div className="account-empty"><p role="alert">{account.error}</p><button className="secondary" onClick={()=>void account.load()}><RefreshCw size={16}/> Reintentar</button></div>;if(!account.authenticated)return <div className="account-empty"><span className="login-icon"><LogIn size={30}/></span><h2>Tu espacio en la barraca.</h2><p>Iniciá sesión para personalizar tu perfil y guardar tus preferencias.</p><a className="primary" href={signInHref} target="_top"><LogIn size={18}/>Iniciar sesión</a><small>Usá tu correo y tu contraseña de Barraca Uno.</small></div>;return <ProfileEditor account={account} theme={theme} setTheme={setTheme}/>;}
export function AccountScreen({authenticated,signInHref}:{authenticated:boolean;signInHref:string}){const account=useAccount(),{theme,setTheme}=useTheme();return <div className="account-page"><header className="account-page-header"><a className="account-logo" href="/"><BrandLogo/></a><a className="back-catalog" href="/"><ArrowLeft size={17}/>Volver al catálogo</a><ThemeButton theme={theme} setTheme={setTheme}/></header><main className="account-page-main"><div className="eyebrow">BARRACA UNO / MI CUENTA</div><h1>{authenticated?'Mi perfil':'Iniciar sesión'}</h1><p className="account-intro">{authenticated?'Tu información y tus preferencias, en un solo lugar.':'Tu cuenta, tu estilo, tu barraca.'}</p><section className="account-card">{authenticated?<AccountContent account={account} theme={theme} setTheme={setTheme}/>:<div className="account-empty"><span className="login-icon"><LogIn size={32}/></span><h2>Bienvenido a Barraca Uno.</h2><p>Entrá con tu correo y tu contraseña de Barraca Uno.</p><a href={signInHref} target="_top" className="primary"><LogIn size={18}/>Iniciar sesión</a><small>Tu perfil se guarda en una base de datos privada.</small></div>}</section><div className="account-help"><ShieldCheck size={18}/><p>Tu correo identifica la cuenta. Solo vos podés consultar y editar tu perfil desde la aplicación.</p></div><a className="guide-link" href="/guia">Cómo usar Barraca Uno</a></main></div>}




