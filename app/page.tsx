import { redirect } from 'next/navigation';
import { getChatGPTUser } from './chatgpt-auth';
import { ensureAccount, accountEnabled } from '../lib/accounts';
import { AccessState } from './access-state';
import { LoginPanel } from './ingresar/panel';
import { enabledProviders } from '../lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Dambru Solutions | Plataforma SaaS Empresarial',
  description: 'Plataforma privada de gestión multi-tenant para empresas.',
};

export default async function Home() {
  const user = await getChatGPTUser();
  if (user) {
    try {
      const account = await ensureAccount(user);
      if (!accountEnabled(account, user)) {
        return <AccessState deleted={account.status === 'deleted'} />;
      }
      redirect('/admin');
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error;
      }
      console.error('Account access check failed', error);
      return <AccessState error />;
    }
  }

  const providers = await enabledProviders();
  return (
    <LoginPanel
      configured={true}
      providers={providers}
      returnTo="/admin"
      initialMode="login"
      initialError=""
    />
  );
}
