import React from 'react';
import Link from 'next/link';
import { getChatGPTUser } from '../chatgpt-auth';
import { isUserPlatformOrTenantAdmin, resolveTenantContext } from '../../lib/tenant-context';
import { ordersRepository, tenantUsersRepository } from '../../lib/data';
import { AppShell, PageContainer } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  ShieldCheck,
  Package,
  Boxes,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getChatGPTUser();
  const isAdmin = await isUserPlatformOrTenantAdmin(user, 'barraca-uno');

  if (!user || !isAdmin) {
    return (
      <AppShell tenantName="Barraca Uno" tenantSlug="barraca-uno" isAdmin={false}>
        <PageContainer
          title="Acceso Restringido"
          eyebrow="Seguridad Dambru SaaS"
          description="Este panel empresarial requiere rol administrativo en la organización."
        >
          <Card className="max-w-md mx-auto text-center p-8 mt-12 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Permisos Insuficientes</h2>
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
        </PageContainer>
      </AppShell>
    );
  }

  // 1. Resolver TenantContext y datos mediante Secure Data Layer
  const context = await resolveTenantContext({ tenantSlug: 'barraca-uno', user });
  if (!context) {
    return (
      <AppShell tenantName="Barraca Uno" tenantSlug="barraca-uno" isAdmin={true}>
        <PageContainer title="Organización no disponible" description="No se pudo resolver el contexto del tenant." />
      </AppShell>
    );
  }

  const [orders, tenantUsers] = await Promise.all([
    ordersRepository.getOrders(context, 100),
    tenantUsersRepository.getTenantUsers(context),
  ]);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total : 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const recentOrders = orders.slice(0, 6);

  return (
    <AppShell
      tenantName={context.tenant.name}
      tenantSlug={context.tenant.slug}
      userEmail={user.email}
      userName={user.fullName || user.displayName}
      isAdmin={true}
    >
      <PageContainer
        eyebrow="PANEL EMPRESARIAL · SAAS"
        title="Dashboard General"
        description="Monitoreo en tiempo real de operaciones, ventas e inventario de la organización."
        breadcrumbs={[
          { label: 'Organización', href: '/' },
          { label: 'Dashboard' },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link href="/pedidos-admin">
                <ShoppingCart size={15} />
                <span>Ver Pedidos</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/stock">
                <Boxes size={15} />
                <span>Control Stock</span>
              </Link>
            </Button>
          </div>
        }
      >
        {/* 1. KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI: Ingresos Totales */}
          <Card className="p-5 hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Ingresos Facturados
              </span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                ${totalRevenue.toLocaleString('es-UY')}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp size={13} />
                <span>Actualizado al instante</span>
              </div>
            </div>
          </Card>

          {/* KPI: Pedidos Pendientes */}
          <Card className="p-5 hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Pedidos Pendientes
              </span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {pendingOrders}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                {pendingOrders > 0 ? 'Requieren revisión en mostrador' : 'Sin pedidos pendientes'}
              </div>
            </div>
          </Card>

          {/* KPI: Miembros del Tenant */}
          <Card className="p-5 hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Equipo / Usuarios
              </span>
              <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {tenantUsers.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Membresías activas de la organización
              </div>
            </div>
          </Card>

          {/* KPI: Seguridad & Tenant Health */}
          <Card className="p-5 hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Aislamiento Multi-Tenant
              </span>
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={20} />
                <span>Activo</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Scope estricto ({context.tenant.slug})
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Sección Principal: Tabla de Órdenes Recientes + Accesos Rápidos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Tabla de Órdenes Recientes */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="p-5 sm:p-6 flex items-center justify-between border-b border-border/70">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Órdenes Recientes
                </h2>
                <p className="text-xs text-muted-foreground">
                  Últimos pedidos registrados en {context.tenant.name}
                </p>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
                <Link href="/pedidos-admin">
                  <span>Ver todas</span>
                  <ArrowUpRight size={14} className="ml-1" />
                </Link>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Identificador</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Monto Total</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay pedidos registrados en este tenant todavía.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const isPending = order.status === 'pending';
                      const isDelivered = order.status === 'delivered';
                      const isCancelled = order.status === 'cancelled';

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="py-3 px-4 sm:px-6 font-mono font-medium text-primary">
                            <Link href={`/pedidos-admin`} className="hover:underline">
                              {order.id.slice(0, 14)}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                              {order.userName || order.userEmail}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {order.shippingCity || 'Montevideo'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                            ${order.total.toLocaleString('es-UY')}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                isPending
                                  ? 'secondary'
                                  : isCancelled
                                  ? 'destructive'
                                  : isDelivered
                                  ? 'default'
                                  : 'outline'
                              }
                              className="text-[10px] font-semibold uppercase px-2 py-0.5"
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleDateString('es-UY')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Accesos Rápidos & Módulos Dambru */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Módulos de Operación
              </h3>
              <div className="space-y-2.5">
                <Link
                  href="/stock"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-sky-500/10 text-primary flex items-center justify-center">
                      <Boxes size={15} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Inventario & Stock</div>
                      <div className="text-muted-foreground text-[11px]">Entradas, salidas y ajustes</div>
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="text-muted-foreground" />
                </Link>

                <Link
                  href="/pedidos-admin"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <ShoppingCart size={15} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Gestión de Pedidos</div>
                      <div className="text-muted-foreground text-[11px]">Aprobaciones y facturación</div>
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="text-muted-foreground" />
                </Link>

                <Link
                  href="/clientes"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Clientes & CRM</div>
                      <div className="text-muted-foreground text-[11px]">Directorio de cuentas</div>
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="text-muted-foreground" />
                </Link>

                <Link
                  href="/administracion"
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Usuarios & Roles</div>
                      <div className="text-muted-foreground text-[11px]">Membresías del tenant</div>
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="text-muted-foreground" />
                </Link>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1.5">
                <ShieldCheck size={16} />
                <span>Dambru Solutions SaaS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organización <strong>{context.tenant.name}</strong> operando bajo aislamiento formal RBAC y base de datos Cloudflare D1.
              </p>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
