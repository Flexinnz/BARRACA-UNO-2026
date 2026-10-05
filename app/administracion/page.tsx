import {requireChatGPTUser} from '../chatgpt-auth';
import {isCompanyAdmin} from '../../lib/accounts';
import {AccountRegistry} from './registry';
export const dynamic='force-dynamic';
export const metadata={title:'Administración de cuentas | Barraca Uno'};
export default async function Administration(){const user=await requireChatGPTUser('/administracion');if(!isCompanyAdmin(user))return <div className="account-page-main access-state"><div className="eyebrow">BARRACA UNO / ADMINISTRACIÓN</div><h1>Acceso de administrador.</h1><p>Este panel está reservado al responsable de la empresa.</p><a className="secondary" href="/">Volver al catálogo</a></div>;return <AccountRegistry/>;}
