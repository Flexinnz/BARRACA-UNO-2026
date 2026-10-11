import React from 'react';
import { Search, X, Download, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerSegment, CustomerMetrics } from './types';

interface CustomersToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  segmentFilter: CustomerSegment;
  onSegmentChange: (seg: CustomerSegment) => void;
  metrics: CustomerMetrics;
  onExportCsv: () => void;
  onNewCustomer: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  totalFiltered: number;
}

export function CustomersToolbar({
  search,
  onSearchChange,
  segmentFilter,
  onSegmentChange,
  metrics,
  onExportCsv,
  onNewCustomer,
  onRefresh,
  refreshing,
  totalFiltered,
}: CustomersToolbarProps) {
  const filters: { id: CustomerSegment; label: string; count?: number; icon?: string }[] = [
    { id: 'all', label: 'Todos', count: metrics.total },
    { id: 'today', label: 'Conectados hoy', count: metrics.connectedToday, icon: '🟢' },
    { id: 'new', label: 'Nuevos', count: metrics.newClients, icon: '✨' },
    { id: 'buyers', label: 'Compradores', count: metrics.buyers, icon: '🛍️' },
    { id: 'vip', label: 'Clientes VIP', count: metrics.vipClients, icon: '⭐' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, correo, empresa o teléfono..."
            className="pl-9 pr-8 h-9 text-sm bg-background border-border/80 focus-visible:ring-1"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Acciones Principales */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={totalFiltered === 0}
            className="h-9 gap-1.5 text-xs font-medium shadow-xs"
            title="Exportar base de clientes filtrada en formato CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={onNewCustomer}
            className="h-9 gap-1.5 text-xs font-medium shadow-xs"
          >
            <Plus size={14} />
            <span>Nuevo cliente</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-9 w-9 shrink-0 shadow-xs"
            title="Actualizar datos"
            aria-label="Actualizar datos"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Píldoras de Segmentación */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => {
          const isActive = segmentFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSegmentChange(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {f.icon && <span>{f.icon}</span>}
              <span>{f.label}</span>
              {typeof f.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
