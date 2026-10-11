import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Clock, Truck, CheckCircle2, DollarSign } from 'lucide-react';
import { Order, formatMoney } from './types';

interface OrdersKpiSummaryProps {
  orders: Order[];
  loading?: boolean;
}

export function OrdersKpiSummary({ orders, loading = false }: OrdersKpiSummaryProps) {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const inProgress = orders.filter((o) => o.status === 'approved' || o.status === 'shipped').length;
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, o) => {
    return o.status !== 'cancelled' ? sum + (o.total || 0) : sum;
  }, 0);

  const kpis = [
    {
      title: 'Total Pedidos',
      value: total,
      subtext: 'Registros en sistema',
      icon: ShoppingBag,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-border/60 hover:border-primary/40',
    },
    {
      title: 'Pendientes',
      value: pending,
      subtext: 'Requieren revisión o pago',
      icon: Clock,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-border/60 hover:border-amber-500/40',
    },
    {
      title: 'En Proceso / Ruta',
      value: inProgress,
      subtext: 'Aprobados o despachados',
      icon: Truck,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-border/60 hover:border-indigo-500/40',
    },
    {
      title: 'Entregados',
      value: delivered,
      subtext: 'Órdenes completadas',
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-border/60 hover:border-emerald-500/40',
    },
    {
      title: 'Facturación Neta',
      value: formatMoney(totalRevenue),
      subtext: 'Excluye órdenes anuladas',
      icon: DollarSign,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-border/60 hover:border-sky-500/40',
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
              <div className={`p-1.5 rounded-lg shrink-0 ${kpi.bg} ${kpi.color}`}>
                <Icon size={16} />
              </div>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
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
