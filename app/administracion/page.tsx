import { cookies } from 'next/headers';
import { requireChatGPTUser } from '../chatgpt-auth';
import { isUserPlatformOrTenantAdmin, resolveSessionTenantSlug } from '../../lib/tenant-context';
import { AccountRegistry } from './registry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administración de cuentas | Dambru Solutions' };

export default async function Administration() {
  const user = await requireChatGPTUser('/administracion');
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get('dambru_tenant')?.value;
  const targetTenantSlug = await resolveSessionTenantSlug(user, cookieSlug);
  const isAdmin = await isUserPlatformOrTenantAdmin(user, targetTenantSlug);

  if (!isAdmin) {
    return (
      <div className="account-page-main access-state">
        <div className="eyebrow">DAMBRU SAAS / ADMINISTRACIÓN</div>
        <h1>Acceso de administrador.</h1>
        <p>Este panel está reservado al responsable de la organización.</p>
        <a className="secondary" href="/admin">Ir al Dashboard</a>
      </div>
    );
  }

  return <AccountRegistry />;
}
