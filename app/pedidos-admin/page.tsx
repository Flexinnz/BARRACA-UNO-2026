import {requireChatGPTUser} from '../chatgpt-auth';
import {isUserPlatformOrTenantAdmin} from '../../lib/tenant-context';
import {OrdersRegistry} from './registry';
export const dynamic='force-dynamic';
export const metadata={title:'Gestión de Pedidos | Barraca Uno'};
export default async function PedidosAdminPage(){
  const user=await requireChatGPTUser('/pedidos-admin');
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');
  if(!isAdmin)return <div className="account-page-main access-state"><div className="eyebrow">BARRACA UNO / ADMINISTRACIÓN</div><h1>Acceso de administrador.</h1><p>Este panel está reservado al equipo de Barraca Uno.</p><a className="secondary" href="/">Volver al catálogo</a></div>;
  return <OrdersRegistry/>;
}
