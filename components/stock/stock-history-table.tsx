import React, { useState } from 'react';
import { History, User, FileText, ArrowRight, PackageX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockMovement } from '@/lib/stock';
import type { StockProduct } from '@/lib/catalog';

interface StockHistoryTableProps {
  movements: StockMovement[];
  products: StockProduct[];
  loading?: boolean;
}

const formatDate = (value: string | undefined | null) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Montevideo',
    }).format(d) + ' hs';
  } catch {
    return String(value);
  }
};

const movementLabels: Record<string, { label: string; badgeClass: string }> = {
  receive: {
    label: 'Entrada',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  issue: {
    label: 'Salida',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  out: {
    label: 'Pedido / Venta',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  count: {
    label: 'Conteo Físico',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
};

export function StockHistoryTable({
  movements,
  products,
  loading = false,
}: StockHistoryTableProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  const filteredMovements = movements.filter((m) => {
    if (selectedProductId === 'all') return true;
    return m.productId === Number(selectedProductId);
  });

  if (loading) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header & Filtro de Producto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <History size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Auditoría de Movimientos en Depósito
            </h3>
            <p className="text-xs text-muted-foreground">
              Trazabilidad de entradas, salidas y conteos (últimos 100 registros)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="history-filter-product" className="text-xs text-muted-foreground font-medium shrink-0">
            Filtrar material:
          </label>
          <select
            id="history-filter-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="h-9 px-3 py-1 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Todos los materiales ({movements.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      {filteredMovements.length === 0 ? (
        <div className="w-full bg-card rounded-xl border border-border/60 p-12 text-center">
          <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <PackageX size={24} />
          </div>
          <h4 className="text-sm font-bold text-foreground mb-1">
            Sin movimientos registrados
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Los movimientos empezarán a figurar acá en tiempo real en cuanto registres una entrada, salida o conteo.
          </p>
        </div>
      ) : (
        <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-3">Responsable</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Variación</th>
                  <th className="py-3 px-3">Saldo (Antes → Después)</th>
                  <th className="py-3 px-4">Motivo / Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredMovements.map((m) => {
                  const product = products.find((p) => p.id === m.productId);
                  const isPositive = m.delta > 0;
                  const cfg = movementLabels[m.type] || {
                    label: m.type,
                    badgeClass: 'bg-muted text-muted-foreground border-border',
                  };
                  const beforeVal = m.before ?? (m as any).beforeQuantity ?? 0;
                  const afterVal = m.after ?? (m as any).afterQuantity ?? 0;

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-foreground tabular-nums">
                        {formatDate(m.createdAt)}
                      </td>

                      {/* Responsable */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-muted-foreground shrink-0" />
                          <div className="truncate max-w-[140px]">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {m.actorName || m.actorEmail?.split('@')[0] || 'Operador'}
                            </div>
                            <small className="text-[10px] text-muted-foreground block truncate">
                              {m.actorEmail}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Material */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[220px]">
                          {product?.name || `Material #${m.productId}`}
                        </div>
                        {product && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {product.sku}
                          </span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Variación */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold tabular-nums">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : m.delta < 0
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-foreground'
                          }
                        >
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        <span>{beforeVal}</span>
                        <ArrowRight size={11} className="inline mx-1 text-muted-foreground/60" />
                        <b className="text-foreground">{afterVal}</b>
                      </td>

                      {/* Motivo y Referencia */}
                      <td className="py-3 px-4 text-xs">
                        <div className="max-w-[200px] sm:max-w-[260px]">
                          <span className="text-foreground font-medium block truncate">
                            {m.reason}
                          </span>
                          {m.reference && (
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 font-mono mt-0.5">
                              <FileText size={11} /> {m.reference}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
