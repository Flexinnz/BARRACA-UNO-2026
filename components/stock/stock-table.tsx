import React from 'react';
import { Plus, Minus, ClipboardCheck, AlertCircle, PackageX, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockProduct } from '@/lib/catalog';
import { stockSectionFor, stockSections } from '@/lib/stock-sections';

interface StockTableProps {
  products: StockProduct[];
  loading: boolean;
  onAdjust: (product: StockProduct, type: 'receive' | 'issue' | 'count') => void;
  onClearFilters?: () => void;
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

export function StockTable({
  products,
  loading,
  onAdjust,
  onClearFilters,
}: StockTableProps) {
  if (loading) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-11 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 hidden sm:block" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20 hidden md:block" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 p-12 text-center shadow-sm">
        <div className="size-14 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-4">
          <PackageX size={28} />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">
          No se encontraron materiales
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
          No hay productos que coincidan con la búsqueda o los filtros seleccionados.
        </p>
        {onClearFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            Restablecer todos los filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Material / Producto</th>
              <th className="py-3 px-3 hidden sm:table-cell">Categoría & Sección</th>
              <th className="py-3 px-4 text-right sm:text-left">Stock Actual</th>
              <th className="py-3 px-3 hidden md:table-cell">Estado</th>
              <th className="py-3 px-3 hidden lg:table-cell">Última Actualización</th>
              <th className="py-3 px-4 text-right">Ajuste de Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {products.map((p) => {
              const sectionId = stockSectionFor(p);
              const section = stockSections.find((s) => s.id === sectionId);
              const isOut = p.stock === 0;
              const isLow = p.stock > 0 && p.stock <= 10;
              const isGood = p.stock > 10;

              return (
                <tr
                  key={p.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* 1. Material Info con Imagen */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-lg bg-muted border border-border/60 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {p.imageSrc ? (
                          <img
                            src={p.imageSrc}
                            alt={p.name}
                            className="size-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback a placeholder si la imagen falla
                              (e.target as HTMLImageElement).src = `/products/${p.imageId || 1}.jpg`;
                            }}
                          />
                        ) : (
                          <Boxes size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-[280px]">
                          {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">
                            {p.sku}
                          </code>
                          <span>·</span>
                          <span>{p.brand || 'Barraca Uno'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Categoría & Sección */}
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-foreground">
                        {p.category}
                      </div>
                      {section && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-primary/60 inline-block" />
                          <span>{section.name}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 3. Existencias */}
                  <td className="py-3 px-4 text-right sm:text-left">
                    <div className="inline-flex flex-col sm:items-start items-end">
                      <span className="font-bold text-base tabular-nums text-foreground tracking-tight">
                        {p.stock.toLocaleString('es-UY')}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium uppercase">
                        {p.unit}
                      </span>
                    </div>
                  </td>

                  {/* 4. Estado Badge */}
                  <td className="py-3 px-3 hidden md:table-cell">
                    {isOut && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        Agotado
                      </span>
                    )}
                    {isLow && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Stock Bajo
                      </span>
                    )}
                    {isGood && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        En Stock
                      </span>
                    )}
                  </td>

                  {/* 5. Última Actualización */}
                  <td className="py-3 px-3 hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                    {formatDate(p.updatedAt)}
                  </td>

                  {/* 6. Acciones */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {/* Botón Entrada */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAdjust(p, 'receive')}
                        title="Añadir entrada de mercadería"
                        className="h-8 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        <Plus size={13} className="mr-1" />
                        <span className="hidden sm:inline">Entrada</span>
                      </Button>

                      {/* Botón Salida */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={p.stock <= 0}
                        onClick={() => onAdjust(p, 'issue')}
                        title={p.stock <= 0 ? 'Sin existencias para salida' : 'Registrar salida de depósito'}
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        <Minus size={13} className="mr-1" />
                        <span className="hidden sm:inline">Salida</span>
                      </Button>

                      {/* Botón Conteo */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onAdjust(p, 'count')}
                        title="Ajustar por conteo físico en inventario"
                        className="h-8 px-2 text-xs"
                      >
                        <ClipboardCheck size={13} />
                        <span className="sr-only sm:not-sr-only sm:ml-1">Conteo</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
