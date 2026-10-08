import React from 'react';
import { Search, X, RefreshCw, Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/catalog';
import { stockSections } from '@/lib/stock-sections';

interface StockToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  section: string;
  onSectionChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  totalCount: number;
  filteredCount: number;
}

export function StockToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  section,
  onSectionChange,
  onRefresh,
  loading,
  totalCount,
  filteredCount,
}: StockToolbarProps) {
  const hasActiveFilters =
    search.trim() !== '' ||
    category !== 'Todas' ||
    status !== 'Todos' ||
    section !== 'all';

  const handleClearFilters = () => {
    onSearchChange('');
    onCategoryChange('Todas');
    onStatusChange('Todos');
    onSectionChange('all');
  };

  return (
    <div className="space-y-3">
      {/* 1. Barra de Controles Principales */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 sm:p-4 rounded-xl border border-border/60 shadow-sm">
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
            placeholder="Buscar por material, SKU o marca…"
            aria-label="Buscar material de stock"
            className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Categoría */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Filtrar por categoría"
              className="h-9 px-3 py-1.5 text-xs sm:text-sm bg-background border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors cursor-pointer"
            >
              <option value="Todas">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Stock */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filtrar por estado de stock"
              className="h-9 px-3 py-1.5 text-xs sm:text-sm bg-background border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="En Stock">🟢 En Stock (&gt;10)</option>
              <option value="Stock Bajo">🟡 Stock Bajo (1-10)</option>
              <option value="Agotado">🔴 Agotados (0)</option>
            </select>
          </div>

          {/* Botón de Refrescar */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Actualizar existencias"
            title="Actualizar existencias"
            className="h-9 px-3 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={13} className="mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* 2. Pills de Secciones de Depósito */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Layers size={13} />
          Depósito:
        </span>
        <button
          type="button"
          onClick={() => onSectionChange('all')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            section === 'all'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Todas las secciones ({totalCount})
        </button>
        {stockSections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSectionChange(sec.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              section === sec.id
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {sec.name}
          </button>
        ))}
      </div>
    </div>
  );
}
