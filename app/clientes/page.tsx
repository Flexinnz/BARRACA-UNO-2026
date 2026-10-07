import { requireChatGPTUser } from '../chatgpt-auth';
import { isUserPlatformOrTenantAdmin } from '../../lib/tenant-context';
import { ClientesPanel } from './panel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gestión de Clientes (CRM SaaS) | Barraca Uno' };

export default async function ClientesPage() {
  const user = await requireChatGPTUser('/clientes');
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');
  if (!isAdmin) {
    return (
      <div className="account-page-main access-state">
        <div className="eyebrow">BARRACA UNO / SaaS CRM</div>
        <h1>Acceso reservado a la administración.</h1>
        <p>Este panel CRM de clientes está reservado al responsable de la empresa.</p>
        <a className="secondary" href="/">Volver al catálogo</a>
      </div>
    );
  }
  return <ClientesPanel />;
}
