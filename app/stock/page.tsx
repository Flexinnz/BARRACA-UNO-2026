import React from 'react';
import Link from 'next/link';
import { requireChatGPTUser } from '../chatgpt-auth';
import { isUserPlatformOrTenantAdmin, resolveTenantContext } from '../../lib/tenant-context';
import { AppShell, PageContainer } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockModule } from '@/components/stock';
import { AlertCircle, ExternalLink, LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Control de Stock e Inventario | Dambru Solutions',
  description: 'Gestión integral de existencias, ajustes de mercadería y trazabilidad de movimientos en depósito.',
};

export default async function StockPage() {
  const user = await requireChatGPTUser('/stock');
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');

  if (!isAdmin) {
    return (
      <AppShell
        tenantName="Barraca Uno"
        tenantSlug="barraca-uno"
        userEmail={user.email}
        userName={user.fullName || user.displayName}
        isAdmin={false}
      >
        <PageContainer
          eyebrow="BARRACA UNO · SEGURIDAD SAAS"
          title="Acceso Restringido"
          description="El módulo de inventario requiere permisos de administración en la organización."
        >
          <Card className="max-w-md mx-auto text-center p-8 mt-12 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Permisos Insuficientes</h2>
            <p className="text-sm text-muted-foreground mb-6">
              El responsable de la empresa o un operador de depósito autorizado puede registrar entradas, salidas y conteos físicos.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/">Ir a Tienda</Link>
              </Button>
              <Button asChild>
                <Link href="/admin">Dashboard Principal</Link>
              </Button>
            </div>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  // Resolver contexto seguro de la organización
  const context = await resolveTenantContext({ tenantSlug: 'barraca-uno', user });
  const tenantName = context ? context.tenant.name : 'Barraca Uno';
  const tenantSlug = context ? context.tenant.slug : 'barraca-uno';

  return (
    <AppShell
      tenantName={tenantName}
      tenantSlug={tenantSlug}
      userEmail={user.email}
      userName={user.fullName || user.displayName}
      isAdmin={true}
    >
      <PageContainer
        eyebrow="LOGÍSTICA & DEPOSITO · SAAS"
        title="Control de Stock"
        description="Gestión integral de existencias, ajustes de mercadería y trazabilidad de movimientos en depósito."
        breadcrumbs={[
          { label: 'Organización', href: '/admin' },
          { label: 'Control de Stock' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href="/admin">
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href="/" target="_blank">
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Ver Catálogo</span>
              </Link>
            </Button>
          </div>
        }
      >
        <StockModule />
      </PageContainer>
    </AppShell>
  );
}
