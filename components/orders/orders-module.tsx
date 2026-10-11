'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order, OrderStatus } from './types';
import { OrdersKpiSummary } from './orders-kpi-summary';
import { OrdersToolbar } from './orders-toolbar';
import { OrdersTable } from './orders-table';
import { OrderDetailDialog } from './order-detail-dialog';

export function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Modal de Detalle
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Cargar pedidos desde la API segura
  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders?all=1', {
        headers: { credentials: 'same-origin' },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('No tenés permisos para gestionar los pedidos de la empresa.');
        }
        throw new Error('Error al conectar con el servidor de pedidos.');
      }

      const data = (await res.json()) as { orders?: Order[]; error?: string };
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al cargar pedidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Lista dinámica de métodos de pago únicos disponibles
  const paymentMethods = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const pm = (o.paymentMethod || o.payment_method || '').trim();
      if (pm) set.add(pm);
    }
    return Array.from(set).sort();
  }, [orders]);

  // Filtrado de pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Búsqueda por texto (ID, Cliente, Email, Ciudad)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = (o.id || '').toLowerCase().includes(q);
        const matchesName = (o.userName || o.user_name || '').toLowerCase().includes(q);
        const matchesEmail = (o.userEmail || o.user_email || '').toLowerCase().includes(q);
        const matchesCity = (o.shippingCity || o.shipping_city || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesEmail && !matchesCity) return false;
      }

      // 2. Filtro por Estado
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }

      // 3. Filtro por Método de Pago
      if (paymentFilter !== 'all') {
        const pm = (o.paymentMethod || o.payment_method || '').trim();
        if (pm.toLowerCase() !== paymentFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  // Actualizar estado del pedido vía PATCH /api/orders/[id]
  const handleUpdateStatus = async (orderId: string, newStatus: string): Promise<boolean> => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Error al actualizar el estado del pedido.');
      }

      // Sincronizar estado local inmediatamente
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      // Si el modal está abierto para este pedido, actualizarlo también
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));

      setFeedback({
        type: 'success',
        message: `Pedido #${orderId} actualizado a estado "${newStatus}". Correo de notificación enviado al comprador.`,
      });

      return true;
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al modificar el estado.',
      });
      return false;
    } finally {
      setSavingStatus(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
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
            onClick={() => loadOrders()}
            className="border-destructive/30 hover:bg-destructive/20 text-destructive"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* KPI Cards Ejecutivas */}
      <OrdersKpiSummary orders={orders} loading={loading} />

      {/* Barra de Filtros y Búsqueda */}
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        paymentMethods={paymentMethods}
        onRefresh={() => loadOrders(true)}
        loading={refreshing}
        totalCount={orders.length}
        filteredCount={filteredOrders.length}
      />

      {/* Tabla de Pedidos */}
      <OrdersTable
        orders={filteredOrders}
        loading={loading}
        onSelectOrder={(o) => setSelectedOrder(o)}
        onClearFilters={handleClearFilters}
      />

      {/* Modal / Diálogo de Detalle del Pedido */}
      <OrderDetailDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        saving={savingStatus}
      />
    </div>
  );
}
