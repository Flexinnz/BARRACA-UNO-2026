import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Boxes, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { StockProduct } from '@/lib/catalog';

interface StockKpiSummaryProps {
  products: StockProduct[];
  loading?: boolean;
}

export function StockKpiSummary({ products, loading = false }: StockKpiSummaryProps) {
  const total = products.length;
  const inStock = products.filter((p) => p.stock > 10).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  const kpis = [
    {
      title: 'Total Materiales',
      value: total,
      description: 'Artículos en catálogo',
      icon: Boxes,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-border/60 hover:border-primary/40',
    },
    {
      title: 'Disponibles',
      value: inStock,
      description: 'Con existencias normales (>10)',
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-border/60 hover:border-emerald-500/40',
    },
    {
      title: 'Stock Bajo',
      value: lowStock,
      description: 'Requiere reposición (1 a 10)',
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-border/60 hover:border-amber-500/40',
    },
    {
      title: 'Agotados',
      value: outOfStock,
      description: 'Sin existencia disponible (0)',
      icon: XCircle,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-border/60 hover:border-rose-500/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.title}
            className={`p-4 sm:p-5 transition-all duration-200 bg-card ${kpi.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                <Icon size={18} />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ) : (
              <div>
                <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${kpi.color}`}>
                  {kpi.value.toLocaleString('es-UY')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.description}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
