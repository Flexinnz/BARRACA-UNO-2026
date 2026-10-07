import {requireChatGPTUser} from '../chatgpt-auth';
import {isUserPlatformOrTenantAdmin} from '../../lib/tenant-context';
import {StockPanel} from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Control de stock | Barraca Uno'};
export default async function StockPage(){
  const user=await requireChatGPTUser('/stock');
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');
  if(!isAdmin)return <div className="account-page-main access-state"><div className="eyebrow">BARRACA UNO / STOCK</div><h1>Acceso de administrador.</h1><p>El responsable de la empresa puede registrar entradas y ajustes.</p><a className="secondary" href="/">Volver al catálogo</a></div>;
  return <StockPanel/>;
}
