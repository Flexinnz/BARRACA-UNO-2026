import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { CustomerMetrics, formatMoney } from './types';

interface CustomersKpiSummaryProps {
  metrics: CustomerMetrics;
  loading?: boolean;
}

export function CustomersKpiSummary({
  metrics,
  loading = false,
}: CustomersKpiSummaryProps) {
  const kpis = [
    {
      title: 'Total clientes',
      value: metrics.total,
      subtext: 'Cartera registrada en la empresa',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-border/60 hover:border-primary/40',
      isLive: false,
      isCurrency: false,
    },
    {
      title: 'Conectados hoy',
      value: metrics.connectedToday,
      subtext: 'Actividad en las últimas 24 horas',
      icon: null,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-border/60 hover:border-emerald-500/40',
      isLive: true,
      isCurrency: false,
    },
    {
      title: 'Compradores activos',
      value: metrics.buyers,
      subtext: `${metrics.newClients} aún sin compras`,
      icon: ShoppingBag,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-border/60 hover:border-amber-500/40',
      isLive: false,
      isCurrency: false,
    },
    {
      title: 'Facturación clientes (LTV)',
      value: formatMoney(metrics.totalRevenue),
      subtext: 'Volumen total acumulado en órdenes',
      icon: DollarSign,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-border/60 hover:border-indigo-500/40',
      isLive: false,
      isCurrency: true,
    },
    {
      title: 'Ticket promedio',
      value: formatMoney(metrics.avgTicket),
      subtext: 'Promedio por comprador activo',
      icon: TrendingUp,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-border/60 hover:border-sky-500/40',
      isLive: false,
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.title}
            className={`p-4 sm:p-4.5 bg-card rounded-xl border transition-all shadow-xs flex flex-col justify-between ${kpi.border}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {kpi.title}
              </span>
              {kpi.isLive ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              ) : (
                Icon && (
                  <div className={`p-1.5 rounded-lg shrink-0 ${kpi.bg} ${kpi.color}`}>
                    <Icon size={16} />
                  </div>
                )
              )}
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ) : (
                <>
                  <div
                    className={`font-semibold tracking-tight ${
                      kpi.isCurrency
                        ? 'text-xl sm:text-2xl font-mono text-foreground'
                        : 'text-2xl sm:text-3xl font-mono text-foreground'
                    }`}
                  >
                    {kpi.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {kpi.subtext}
                  </p>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
