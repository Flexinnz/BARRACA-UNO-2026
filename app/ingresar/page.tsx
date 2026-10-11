import {LoginPanel} from './panel';
import {authConfig,enabledProviders,safeReturn} from '../../lib/supabase';
export const dynamic='force-dynamic';
export const metadata={title:'Iniciar sesión | Dambru Solutions'};
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string;error?:string;mode?:string}>}){const params=await searchParams;return <LoginPanel configured={true} providers={await enabledProviders()} returnTo={safeReturn(params.return_to)} initialMode={params.mode==='register'?'register':params.mode==='reset'?'reset':'login'} initialError={params.error?'El enlace no es válido o venció. Solicitá uno nuevo.':''}/>;}

