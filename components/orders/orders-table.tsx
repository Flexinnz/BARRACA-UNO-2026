import React, { useState } from 'react';
import {
  ShoppingBag,
  User,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  PackageX,
  FileText,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Order, STATUS_CONFIG, formatDate, formatMoney } from './types';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onSelectOrder: (order: Order) => void;
  onClearFilters?: () => void;
}

export function OrdersTable({
  orders,
  loading,
  onSelectOrder,
  onClearFilters,
}: OrdersTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-24 hidden sm:block" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 p-12 text-center shadow-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <PackageX size={24} />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          No se encontraron pedidos
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          No hay órdenes que coincidan con la búsqueda o todavía no se registraron pedidos en esta organización.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpiar filtros de búsqueda
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-xs">
      {/* Desktop / Tablet Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Orden / ID</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 hidden lg:table-cell">Destino</th>
              <th className="py-3 px-4 hidden xl:table-cell">Pago</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.map((o) => {
              const statusCfg = STATUS_CONFIG[o.status] || {
                label: o.status,
                badgeClass: 'bg-muted text-foreground border-border',
                dotColor: 'bg-muted-foreground',
                icon: FileText,
              };
              const isExpanded = expandedRow === o.id;
              const itemsList = (o.itemsSummary || o.items_summary || '').split('|').filter(Boolean);

              return (
                <React.Fragment key={o.id}>
                  <tr
                    onClick={() => onSelectOrder(o)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* ID de Pedido */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(o.id, e)}
                          className="text-muted-foreground hover:text-foreground p-1 -ml-1 rounded transition-colors"
                          aria-label={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={15} className="text-primary/70 shrink-0" />
                          <span className="font-mono font-semibold text-foreground tracking-tight">
                            {o.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {formatDate(o.createdAt || o.created_at)}
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-medium text-foreground truncate">
                        {o.userName || o.user_name || 'Cliente sin nombre'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.userEmail || o.user_email}
                      </div>
                    </td>

                    {/* Destino */}
                    <td className="py-3.5 px-4 hidden lg:table-cell max-w-[180px]">
                      <div className="flex items-center gap-1.5 text-xs text-foreground truncate">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{o.shippingCity || o.shipping_city || '—'}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate pl-4">
                        {o.shippingAddress || o.shipping_address || '—'}
                      </div>
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3.5 px-4 hidden xl:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        <CreditCard size={13} className="text-muted-foreground" />
                        {o.paymentMethod || o.payment_method || '—'}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(o.total)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.badgeClass}`}
                      >
                        <span className={`size-1.5 rounded-full ${statusCfg.dotColor} animate-pulse`} />
                        {statusCfg.label}
                      </Badge>
                    </td>

                    {/* Botón Ver Detalle */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(o);
                        }}
                        className="h-8 px-2.5 text-xs font-medium gap-1 shadow-2xs hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <span>Detalle</span>
                        <ArrowRight size={12} />
                      </Button>
                    </td>
                  </tr>

                  {/* Fila Expandible con Detalle Rápido */}
                  {isExpanded && (
                    <tr className="bg-muted/20 border-b border-border/40">
                      <td colSpan={8} className="py-3 px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs py-1">
                          {/* Productos en la orden */}
                          <div className="md:col-span-2 space-y-1.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <Package size={14} className="text-primary" />
                              <span>Productos incluidos:</span>
                            </div>
                            {itemsList.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {itemsList.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block bg-background px-2.5 py-1 rounded-md border border-border/60 text-foreground font-mono text-[11px]"
                                  >
                                    {item.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">
                                Sin resumen de productos
                              </p>
                            )}
                          </div>

                          {/* Contacto y Notas */}
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <Phone size={13} className="text-muted-foreground" />
                              <span>Tel: {o.shippingPhone || o.shipping_phone || '—'}</span>
                            </div>
                            {(o.notes) && (
                              <p className="text-muted-foreground text-[11px] line-clamp-2">
                                <strong>Nota:</strong> {o.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
