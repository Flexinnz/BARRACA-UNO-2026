'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Package,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StockProduct } from '@/lib/catalog';
import type { StockMovement } from '@/lib/stock';
import { stockSectionFor } from '@/lib/stock-sections';

import { StockKpiSummary } from './stock-kpi-summary';
import { StockToolbar } from './stock-toolbar';
import { StockTable } from './stock-table';
import { StockAdjustmentDialog, type AdjustmentType } from './stock-adjustment-dialog';
import { StockHistoryTable } from './stock-history-table';

export function StockModule() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [section, setSection] = useState('all');

  // Diálogo de Ajuste
  const [pendingAdjustment, setPendingAdjustment] = useState<{
    product: StockProduct;
    type: AdjustmentType;
    id: string;
  } | null>(null);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | undefined>(undefined);

  // Tab activo
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');

  // Cargar datos desde la API segura
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/stock', {
        headers: { credentials: 'same-origin' },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('No tenés permisos suficientes para gestionar el inventario.');
        }
        throw new Error('Error al conectar con el servidor de inventario.');
      }

      const data = (await res.json()) as {
        products?: StockProduct[];
        movements?: StockMovement[];
        error?: string;
      };
      if (Array.isArray(data.products)) {
        setProducts(data.products);
      }
      if (Array.isArray(data.movements)) {
        setMovements(data.movements);
      }
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al cargar el stock.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Búsqueda por texto (nombre o SKU o ID)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesSku = (product.sku || '').toLowerCase().includes(q);
        const matchesId = String(product.id).includes(q);
        if (!matchesName && !matchesSku && !matchesId) return false;
      }

      // 2. Filtro por Categoría
      if (category !== 'Todas' && product.category !== category) {
        return false;
      }

      // 3. Filtro por Estado de Stock
      if (status === 'in_stock' && product.stock <= 10) return false;
      if (status === 'low_stock' && (product.stock === 0 || product.stock > 10)) return false;
      if (status === 'out_of_stock' && product.stock > 0) return false;

      // 4. Filtro por Sección / Depósito
      if (section !== 'all') {
        const prodSectionId = stockSectionFor(product);
        if (prodSectionId !== section) return false;
      }

      return true;
    });
  }, [products, search, category, status, section]);

  // Manejar apertura del modal de ajuste
  const handleOpenAdjustment = (product: StockProduct, type: AdjustmentType) => {
    setAdjustmentError(undefined);
    setPendingAdjustment({
      product,
      type,
      id: `${product.id}-${Date.now()}`,
    });
  };

  // Enviar ajuste al servidor
  const handleSubmitAdjustment = async (data: {
    productId: number;
    type: AdjustmentType;
    amount: number;
    reason: string;
    reference: string;
    id: string;
    version: number;
  }): Promise<boolean> => {
    setSavingAdjustment(true);
    setAdjustmentError(undefined);

    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = (await res.json()) as {
        ok?: boolean;
        products?: StockProduct[];
        movements?: StockMovement[];
        error?: string;
      };

      if (!res.ok || result.error) {
        const errorText = result.error || 'No se pudo procesar el ajuste de inventario.';
        setAdjustmentError(errorText);
        return false;
      }

      // Actualizar estado sincronizado
      if (result.products && Array.isArray(result.products)) {
        setProducts(result.products);
      }
      if (result.movements && Array.isArray(result.movements)) {
        setMovements(result.movements);
      }

      // Mensaje de éxito
      const typeLabel =
        data.type === 'receive' ? 'Entrada registrada' :
        data.type === 'issue' ? 'Salida registrada' : 'Conteo actualizado';

      setFeedback({
        type: 'success',
        message: `${typeLabel} con éxito para el material #${data.productId}. Existencias actualizadas.`,
      });

      // Cerrar modal
      setPendingAdjustment(null);
      return true;
    } catch (err) {
      console.error('Error al guardar movimiento:', err);
      setAdjustmentError(err instanceof Error ? err.message : 'Error al registrar el movimiento.');
      return false;
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Limpiar todos los filtros
  const handleClearFilters = () => {
    setSearch('');
    setCategory('Todas');
    setStatus('Todos');
    setSection('all');
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast / Alert Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md"
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error de Conexión */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData()}
            className="border-destructive/30 hover:bg-destructive/20 text-destructive"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* KPI Resumen */}
      <StockKpiSummary products={products} loading={loading} />

      {/* Tabs Principales: Inventario vs Auditoría de Movimientos */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'inventory' | 'history')}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
          <TabsList className="bg-muted/60 p-1 rounded-lg">
            <TabsTrigger
              value="inventory"
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              <Boxes size={15} />
              <span>Existencias en Depósito</span>
              {!loading && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono ml-1">
                  {products.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              <History size={15} />
              <span>Auditoría & Movimientos</span>
              {!loading && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono ml-1">
                  {movements.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-muted-foreground flex items-center gap-2 self-end sm:self-auto">
            <Package size={14} className="text-primary/70" />
            <span>Gestión en tiempo real con aislamiento de organización</span>
          </div>
        </div>

        {/* Tab 1: Existencias y Gestión de Stock */}
        <TabsContent value="inventory" className="space-y-4 m-0 outline-none">
          <StockToolbar
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            status={status}
            onStatusChange={setStatus}
            section={section}
            onSectionChange={setSection}
            onRefresh={() => loadData(true)}
            loading={refreshing}
            totalCount={products.length}
            filteredCount={filteredProducts.length}
          />

          <StockTable
            products={filteredProducts}
            loading={loading}
            onAdjust={handleOpenAdjustment}
            onClearFilters={handleClearFilters}
          />
        </TabsContent>

        {/* Tab 2: Auditoría y Movimientos Históricos */}
        <TabsContent value="history" className="space-y-4 m-0 outline-none">
          <StockHistoryTable
            movements={movements}
            products={products}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Diálogo Modal de Ajuste de Stock */}
      <StockAdjustmentDialog
        pending={pendingAdjustment}
        onClose={() => setPendingAdjustment(null)}
        onSubmit={handleSubmitAdjustment}
        saving={savingAdjustment}
        externalError={adjustmentError}
      />
    </div>
  );
}
