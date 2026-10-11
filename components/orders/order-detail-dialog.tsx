import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  User,
  MapPin,
  CreditCard,
  Package,
  Calendar,
  Clock,
  Phone,
  StickyNote,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Order,
  OrderItem,
  STATUS_CONFIG,
  OrderStatus,
  formatDate,
  formatMoney,
} from './types';

interface OrderDetailDialogProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<boolean>;
  saving: boolean;
}

export function OrderDetailDialog({
  order,
  onClose,
  onUpdateStatus,
  saving,
}: OrderDetailDialogProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!order) {
      setItems([]);
      setSelectedStatus('');
      setFeedback(null);
      return;
    }

    setSelectedStatus(order.status);
    setFeedback(null);
    setLoadingItems(true);
    setItemsError(null);

    // Fetch items específicos del pedido
    fetch(`/api/orders/${order.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los artículos del pedido.');
        const data = (await res.json()) as { items?: OrderItem[] };
        setItems(data.items || []);
      })
      .catch((err) => {
        console.error('Error fetching order items:', err);
        setItemsError(err instanceof Error ? err.message : 'Error al cargar ítems');
      })
      .finally(() => {
        setLoadingItems(false);
      });
  }, [order]);

  if (!order) return null;

  const currentStatusCfg = STATUS_CONFIG[order.status] || {
    label: order.status,
    badgeClass: 'bg-muted text-foreground border-border',
    dotColor: 'bg-muted-foreground',
    icon: FileText,
    description: '',
  };

  const nextStatusCfg = STATUS_CONFIG[selectedStatus];

  const handleSaveStatus = async () => {
    if (selectedStatus === order.status) return;
    setFeedback(null);

    const success = await onUpdateStatus(order.id, selectedStatus);
    if (success) {
      setFeedback({
        type: 'success',
        message: `Estado actualizado a "${STATUS_CONFIG[selectedStatus]?.label || selectedStatus}". Notificación enviada al cliente.`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: 'No se pudo actualizar el estado del pedido. Verificá tus permisos.',
      });
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80">
        {/* Cabecera del Diálogo */}
        <DialogHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-primary tracking-wider uppercase">
                  GESTIÓN DE PEDIDO
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatDate(order.createdAt || order.created_at)}
                </span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2 mt-1">
                <ShoppingBag size={20} className="text-primary" />
                <span>{order.id}</span>
              </DialogTitle>
            </div>

            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full self-start sm:self-center ${currentStatusCfg.badgeClass}`}
            >
              <span className={`size-2 rounded-full ${currentStatusCfg.dotColor} animate-pulse`} />
              {currentStatusCfg.label}
            </Badge>
          </div>
          <DialogDescription className="sr-only">
            Detalle del pedido #{order.id}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Feedback Banner */}
          {feedback && (
            <div
              role="status"
              className={`flex items-center gap-2.5 p-3.5 rounded-lg border text-xs sm:text-sm font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Grid de Información: Cliente, Envío, Pago */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Cliente */}
            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <User size={13} className="text-primary" />
                <span>Cliente</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {order.userName || order.user_name || 'Sin nombre'}
                </p>
                <p className="text-xs text-muted-foreground break-all">
                  {order.userEmail || order.user_email}
                </p>
                {(order.shippingPhone || order.shipping_phone) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone size={11} />
                    <span>{order.shippingPhone || order.shipping_phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 2. Destino / Envío */}
            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <MapPin size={13} className="text-primary" />
                <span>Envío & Entrega</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {order.shippingCity || order.shipping_city || '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.shippingAddress || order.shipping_address || '—'}
                </p>
              </div>
            </div>

            {/* 3. Pago & Totales */}
            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <CreditCard size={13} className="text-primary" />
                <span>Pago & Facturación</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm capitalize">
                  {order.paymentMethod || order.payment_method || '—'}
                </p>
                <div className="mt-1.5 space-y-0.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatMoney(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA (22%):</span>
                    <span className="font-mono">{formatMoney(order.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border/40">
                    <span>Total:</span>
                    <span className="font-mono">{formatMoney(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas de compra / Facturación DGI si existen */}
          {order.notes && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <StickyNote size={13} className="text-primary" />
                <span>Notas del Pedido / Datos Fiscales:</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          )}

          {/* Artículos del Pedido */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package size={16} className="text-primary" />
                <span>Materiales y Productos del Pedido</span>
              </h4>
              <span className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              {loadingItems ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : itemsError ? (
                <div className="p-4 text-center text-xs text-destructive">
                  {itemsError}
                </div>
              ) : items.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  {order.itemsSummary || order.items_summary || 'Sin detalle de productos registrado.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/50 font-semibold text-muted-foreground uppercase text-[10px]">
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {items.map((it) => (
                        <tr key={it.id || `${it.productId}-${it.quantity}`}>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {it.productSku || it.product_sku || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {it.productName || it.product_name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-foreground">
                            {it.quantity} {it.productUnit || it.product_unit || 'un.'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {formatMoney(it.unitPrice || it.unit_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            {formatMoney(it.lineTotal || it.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Actualización de Estado */}
          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Control de Estado de la Orden
            </h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={saving}
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all cursor-pointer font-medium text-foreground disabled:opacity-50"
                  aria-label="Seleccionar nuevo estado"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ▼
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSaveStatus}
                disabled={saving || selectedStatus === order.status}
                className="shrink-0 h-9 px-4 gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <span>Guardar nuevo estado</span>
                )}
              </Button>
            </div>

            {nextStatusCfg && nextStatusCfg.description && (
              <p className="text-[11px] text-muted-foreground">
                <strong>Efecto:</strong> {nextStatusCfg.description}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
