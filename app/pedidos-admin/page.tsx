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
import { OrdersModule } from '@/components/orders';
import { AlertCircle, LayoutDashboard, Boxes } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Gestión de Pedidos | Dambru Solutions',
  description: 'Monitoreo de órdenes entrantes, control de envíos y actualización de estados en tiempo real.',
};

export default async function PedidosAdminPage() {
  const user = await requireChatGPTUser('/pedidos-admin');
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
          description="El módulo de pedidos requiere permisos administrativos en la organización."
        >
          <Card className="max-w-md mx-auto text-center p-8 mt-12 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Permisos Insuficientes</h2>
            <p className="text-sm text-muted-foreground mb-6">
              El responsable de la empresa o un operador de mostrador/ventas autorizado puede gestionar los pedidos recibidos.
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
        eyebrow="OPERACIONES & LOGÍSTICA · SAAS"
        title="Gestión de Pedidos"
        description="Monitoreo de órdenes entrantes, control de envíos y actualización de estados en tiempo real."
        breadcrumbs={[
          { label: 'Organización', href: '/admin' },
          { label: 'Gestión de Pedidos' },
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
              <Link href="/stock">
                <Boxes size={14} />
                <span className="hidden sm:inline">Control Stock</span>
              </Link>
            </Button>
          </div>
        }
      >
        <OrdersModule />
      </PageContainer>
    </AppShell>
  );
}
