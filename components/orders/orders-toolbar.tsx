import React from 'react';
import { Search, X, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG } from './types';

interface OrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (value: string) => void;
  paymentMethods: string[];
  onRefresh: () => void;
  loading: boolean;
  totalCount: number;
  filteredCount: number;
}

export function OrdersToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  paymentMethods,
  onRefresh,
  loading,
  totalCount,
  filteredCount,
}: OrdersToolbarProps) {
  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || paymentFilter !== 'all';

  const handleClearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPaymentFilterChange('all');
  };

  return (
    <div className="space-y-3">
      {/* Barra de Controles Principales */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-xs">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por N° orden, cliente, email, ciudad..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-background rounded-lg border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
            aria-label="Buscar pedidos"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros Dropdowns y Acciones */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Filtro por Estado */}
          <div className="relative flex-1 sm:flex-none min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all cursor-pointer font-medium text-foreground"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
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

          {/* Filtro por Método de Pago (si hay varios) */}
          {paymentMethods.length > 0 && (
            <div className="relative flex-1 sm:flex-none min-w-[150px]">
              <select
                value={paymentFilter}
                onChange={(e) => onPaymentFilterChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all cursor-pointer font-medium text-foreground"
                aria-label="Filtrar por medio de pago"
              >
                <option value="all">Todos los pagos</option>
                {paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ▼
              </div>
            </div>
          )}

          {/* Botón Refrescar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-3 gap-1.5 shrink-0"
            aria-label="Actualizar pedidos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Botón Limpiar Filtros */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Contador y Estado de Filtros */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-primary/70" />
          <span>
            Mostrando <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> pedidos
          </span>
          {hasActiveFilters && (
            <span className="text-primary font-medium">(filtrado activo)</span>
          )}
        </div>
      </div>
    </div>
  );
}
