import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireChatGPTUser } from '../chatgpt-auth';
import {
  isUserPlatformOrTenantAdmin,
  resolveTenantContext,
  resolveSessionTenantSlug,
} from '../../lib/tenant-context';
import { AppShell, PageContainer } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomersModule } from '@/components/customers';
import { AlertCircle, ShoppingBag, LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Gestión de Clientes y CRM | Dambru Solutions',
  description: 'Control de cartera de clientes, segmentación inteligente, historial de compras y actividad en tiempo real.',
};

export default async function ClientesPage() {
  const user = await requireChatGPTUser('/clientes');
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get('dambru_tenant')?.value;
  const targetTenantSlug = await resolveSessionTenantSlug(user, cookieSlug);
  const isAdmin = await isUserPlatformOrTenantAdmin(user, targetTenantSlug);

  if (!isAdmin) {
    return (
      <AppShell
        tenantName="Dambru SaaS"
        tenantSlug={targetTenantSlug}
        userEmail={user.email}
        userName={user.fullName || user.displayName}
        isAdmin={false}
      >
        <PageContainer
          eyebrow="DAMBRU SAAS · SEGURIDAD EMPRESARIAL"
          title="Acceso Restringido"
          description="El módulo CRM de clientes requiere permisos de administración en la organización."
        >
          <Card className="max-w-md mx-auto text-center p-8 mt-12 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Permisos Insuficientes</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Este módulo de clientes y CRM está reservado al responsable y al equipo comercial autorizado de la empresa.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/admin">Dashboard Principal</Link>
              </Button>
              <Button asChild>
                <Link href="/cuenta">Mi Cuenta</Link>
              </Button>
            </div>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  // Resolver contexto seguro de la organización
  const context = await resolveTenantContext({ tenantSlug: targetTenantSlug, user });
  const tenantName = context ? context.tenant.name : 'Dambru SaaS';
  const tenantSlug = context ? context.tenant.slug : targetTenantSlug;

  return (
    <AppShell
      tenantName={tenantName}
      tenantSlug={tenantSlug}
      userEmail={user.email}
      userName={user.fullName || user.displayName}
      isAdmin={true}
    >
      <PageContainer
        eyebrow="COMERCIAL & CRM · SAAS"
        title="Gestión de Clientes"
        description="Control de cartera, segmentación inteligente, historial de compras y actividad en tiempo real."
        breadcrumbs={[
          { label: 'Organización', href: '/admin' },
          { label: 'Clientes & CRM' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href="/pedidos-admin">
                <ShoppingBag size={14} />
                <span className="hidden sm:inline">Pedidos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href="/admin">
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          </div>
        }
      >
        <CustomersModule />
      </PageContainer>
    </AppShell>
  );
}
