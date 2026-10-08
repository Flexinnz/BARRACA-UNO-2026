import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  ClipboardCheck,
  X,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StockProduct } from '@/lib/catalog';

export type AdjustmentType = 'receive' | 'issue' | 'count';

interface StockAdjustmentDialogProps {
  pending: {
    product: StockProduct;
    type: AdjustmentType;
    id: string;
  } | null;
  onClose: () => void;
  onSubmit: (data: {
    productId: number;
    type: AdjustmentType;
    amount: number;
    reason: string;
    reference: string;
    id: string;
    version: number;
  }) => Promise<boolean>;
  saving: boolean;
  externalError?: string;
}

export function StockAdjustmentDialog({
  pending,
  onClose,
  onSubmit,
  saving,
  externalError,
}: StockAdjustmentDialogProps) {
  if (!pending) return null;

  const [currentType, setCurrentType] = useState<AdjustmentType>(pending.type);
  const [amountStr, setAmountStr] = useState(
    pending.type === 'count' ? String(pending.product.stock) : ''
  );
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState(externalError || '');

  // Sincronizar si cambia el pending
  useEffect(() => {
    setCurrentType(pending.type);
    setAmountStr(pending.type === 'count' ? String(pending.product.stock) : '');
    setReason('');
    setReference('');
    setErrorMsg(externalError || '');
  }, [pending, externalError]);

  const n = Number(amountStr);
  const currentStock = pending.product.stock;

  const nextStock =
    amountStr.trim() === ''
      ? currentStock
      : currentType === 'receive'
      ? currentStock + n
      : currentType === 'issue'
      ? currentStock - n
      : n;

  const isCount = currentType === 'count';
  const isReceive = currentType === 'receive';
  const isIssue = currentType === 'issue';

  // Validaciones
  const isValidAmount =
    amountStr.trim() !== '' &&
    Number.isSafeInteger(n) &&
    n >= (isCount ? 0 : 1) &&
    n <= 1000000;

  const isValidNext = nextStock >= 0 && nextStock <= 1000000;
  const isDifferent = nextStock !== currentStock;
  const hasReason = reason.trim().length > 0;
  const isFormValid = isValidAmount && isValidNext && isDifferent && hasReason;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || saving) return;

    setErrorMsg('');
    const success = await onSubmit({
      productId: pending.product.id,
      type: currentType,
      amount: n,
      reason: reason.trim(),
      reference: reference.trim(),
      id: pending.id,
      version: pending.product.version,
    });

    if (success) {
      onClose();
    }
  };

  const labels: Record<AdjustmentType, { title: string; verb: string; icon: typeof Plus; color: string }> = {
    receive: {
      title: 'Entrada de Mercadería',
      verb: 'Añadir al stock',
      icon: Plus,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    issue: {
      title: 'Salida de Material',
      verb: 'Descontar del stock',
      icon: Minus,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    count: {
      title: 'Ajuste por Conteo Físico',
      verb: 'Fijar total físico',
      icon: ClipboardCheck,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
  };

  const activeConfig = labels[currentType];
  const ActiveIcon = activeConfig.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${activeConfig.color}`}>
              <ActiveIcon size={18} />
            </div>
            <div>
              <h2 id="dialog-title" className="text-base font-bold text-foreground">
                {activeConfig.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                Registro de movimiento con trazabilidad y auditoría
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Ficha Resumida del Producto */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="size-12 rounded-lg bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center">
              {pending.product.imageSrc ? (
                <img
                  src={pending.product.imageSrc}
                  alt={pending.product.name}
                  className="size-full object-cover"
                />
              ) : (
                <Boxes size={22} className="text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-foreground truncate">
                {pending.product.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>SKU: {pending.product.sku}</span>
                <span>·</span>
                <span>Categoría: {pending.product.category}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                Actual
              </span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {currentStock} {pending.product.unit}
              </span>
            </div>
          </div>

          {/* Selector de Tipo de Movimiento */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentType('receive');
                  setAmountStr('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  isReceive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Plus size={14} /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentType('issue');
                  setAmountStr('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  isIssue
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Minus size={14} /> Salida (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentType('count');
                  setAmountStr(String(currentStock));
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  isCount
                    ? 'bg-primary/10 text-primary border-primary/40 shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <ClipboardCheck size={14} /> Conteo (=)
              </button>
            </div>
          </div>

          {/* Input de Cantidad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="adjust-amount" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {isCount ? 'Cantidad Total Contada' : isReceive ? 'Cantidad Entrante' : 'Cantidad Saliente'}
              </label>
              <span className="text-xs text-muted-foreground font-medium">
                Unidad: <b className="text-foreground">{pending.product.unit}</b>
              </span>
            </div>
            <div className="relative">
              <input
                id="adjust-amount"
                type="number"
                min={isCount ? 0 : 1}
                max={1000000}
                step={1}
                required
                autoFocus
                disabled={saving}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder={isCount ? 'Ingresá el total físico' : 'Ej. 50'}
                className="w-full px-3 py-2 text-base font-semibold tabular-nums bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isCount
                ? 'El valor reemplazará el stock actual; se calculará el faltante o sobrante.'
                : isReceive
                ? 'Se sumará directamente al inventario disponible.'
                : 'Se descontará del inventario. No puede superar el disponible actual.'}
            </p>
          </div>

          {/* Input de Motivo */}
          <div>
            <label htmlFor="adjust-reason" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Motivo de la Operación <span className="text-rose-500">*</span>
            </label>
            <input
              id="adjust-reason"
              type="text"
              required
              maxLength={240}
              disabled={saving}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isReceive
                  ? 'Ej. Recepción de proveedor Gerdau'
                  : isIssue
                  ? 'Ej. Entrega a obra o cliente'
                  : 'Ej. Conteo físico de depósito mensual'
              }
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          {/* Input de Referencia */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="adjust-ref" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Documento / Referencia
              </label>
              <span className="text-[11px] text-muted-foreground">Opcional</span>
            </div>
            <input
              id="adjust-ref"
              type="text"
              maxLength={120}
              disabled={saving}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Remito N° 4589, Factura A-1234"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          {/* Previsualización en Vivo de Stock Resultante */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                Stock Actual
              </span>
              <strong className="text-base text-foreground tabular-nums">
                {currentStock} {pending.product.unit}
              </strong>
            </div>

            <ArrowRight size={18} className="text-muted-foreground shrink-0" />

            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">
                Stock Resultante
              </span>
              <strong
                className={`text-lg tabular-nums font-extrabold ${
                  nextStock < 0
                    ? 'text-rose-500'
                    : isDifferent
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-foreground'
                }`}
              >
                {amountStr.trim() === '' ? '—' : `${nextStock} ${pending.product.unit}`}
              </strong>
            </div>
          </div>

          {/* Mensajes de Error */}
          {(errorMsg || nextStock < 0 || (amountStr.trim() !== '' && !isDifferent)) && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                {errorMsg ||
                  (nextStock < 0
                    ? 'La salida solicitada supera las existencias físicas disponibles en depósito.'
                    : 'La cantidad ingresada coincide con el stock actual; no hay variación para registrar.')}
              </span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || saving}
              className="font-semibold shadow-xs"
            >
              {saving ? 'Guardando movimiento…' : 'Confirmar Ajuste'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
