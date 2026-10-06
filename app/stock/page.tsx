import {requireChatGPTUser} from '../chatgpt-auth';
import {isCompanyAdmin} from '../../lib/accounts';
import {StockPanel} from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Control de stock | Barraca Uno'};
import Link from 'next/link';
export default async function StockPage(){const user=await requireChatGPTUser('/stock');if(!isCompanyAdmin(user))return <div className="account-page-main access-state"><div className="eyebrow">BARRACA UNO / STOCK</div><h1>Acceso de administrador.</h1><p>El responsable de la empresa puede registrar entradas y ajustes.</p><Link className="secondary" href="/">Volver al catálogo</Link></div>;return <StockPanel/>}
