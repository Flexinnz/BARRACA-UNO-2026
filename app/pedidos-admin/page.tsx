import {requireChatGPTUser} from '../chatgpt-auth';
import {isCompanyAdmin} from '../../lib/accounts';
import {OrdersRegistry} from './registry';
import Link from 'next/link';
export const dynamic='force-dynamic';
export const metadata={title:'Gestión de Pedidos | Barraca Uno'};
export default async function PedidosAdminPage(){
  const user=await requireChatGPTUser('/pedidos-admin');
  if(!isCompanyAdmin(user))return <div className="account-page-main access-state"><div className="eyebrow">BARRACA UNO / ADMINISTRACIÓN</div><h1>Acceso de administrador.</h1><p>Este panel está reservado al equipo de Barraca Uno.</p><Link className="secondary" href="/">Volver al catálogo</Link></div>;
  return <OrdersRegistry/>;
}
