import React from 'react';
import Link from 'next/link';
import { getChatGPTUser } from '../chatgpt-auth';
import { isUserPlatformOrTenantAdmin, resolveTenantContext } from '../../lib/tenant-context';
import { AppShell } from '@/components/layout';
import { DashboardSection } from '../admin-dashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getChatGPTUser();
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');

  if (!user || !isAdmin) {
    return (
      <AppShell tenantName="Barraca Uno" tenantSlug="barraca-uno" isAdmin={false}>
        <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <Card className="p-8 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Permisos insuficientes</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Iniciá sesión con una cuenta autorizada de la empresa para acceder a las métricas del negocio.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/">Ir a Tienda</Link>
              </Button>
              <Button asChild>
                <Link href="/ingresar">Iniciar Sesión</Link>
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const context = await resolveTenantContext({ tenantSlug: 'barraca-uno', user });

  return (
    <AppShell
      tenantName={context?.tenant?.name || 'Barraca Uno'}
      tenantSlug={context?.tenant?.slug || 'barraca-uno'}
      userEmail={user.email}
      userName={user.fullName || user.displayName}
      isAdmin={true}
    >
      <DashboardSection />
    </AppShell>
  );
}
