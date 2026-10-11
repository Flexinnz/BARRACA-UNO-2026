'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Customer,
  CustomerMetrics,
  CustomerSegment,
  isConnectedToday,
} from './types';
import { CustomersKpiSummary } from './customers-kpi-summary';
import { CustomersToolbar } from './customers-toolbar';
import { CustomersTable } from './customers-table';
import { CustomerDetailDialog } from './customer-detail-dialog';
import { CustomerCreateDialog } from './customer-create-dialog';

export function CustomersModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total: 0,
    connectedToday: 0,
    buyers: 0,
    newClients: 0,
    vipClients: 0,
    totalRevenue: 0,
    avgTicket: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<CustomerSegment>('all');

  // Modales
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar clientes desde la API
  const loadCustomers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/customers', {
        headers: { credentials: 'same-origin' },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('No tenés permisos suficientes para consultar la cartera de clientes.');
        }
        throw new Error('Error al conectar con el servidor de clientes.');
      }

      const data = (await res.json()) as {
        customers?: Customer[];
        metrics?: CustomerMetrics;
      };

      if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        setCustomers([]);
      }

      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al cargar clientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filtrado de clientes
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Búsqueda por texto (Nombre, Email, Empresa, Teléfono)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = (c.displayName || '').toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        const matchesCompany = (c.company || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').includes(q);
        if (!matchesName && !matchesEmail && !matchesCompany && !matchesPhone) {
          return false;
        }
      }

      // 2. Filtro por Segmento
      if (segmentFilter === 'today') return isConnectedToday(c.lastSeenAt);
      if (segmentFilter === 'new') return (c.ordersCount || 0) === 0;
      if (segmentFilter === 'buyers') return (c.ordersCount || 0) > 0;
      if (segmentFilter === 'vip') return (c.totalSpent || 0) >= 5000;

      return true;
    });
  }, [customers, search, segmentFilter]);

  // Exportar a CSV
  const handleExportCsv = () => {
    if (filteredCustomers.length === 0) return;

    let csv = '\uFEFF'; // BOM para compatibilidad con Excel
    csv += 'ID,Nombre,Correo,Empresa,Telefono,TotalGastado,Pedidos,UltimaActividad,FechaRegistro\n';

    filteredCustomers.forEach((c) => {
      const name = (c.displayName || '').replace(/"/g, '""');
      const email = (c.email || '').replace(/"/g, '""');
      const comp = (c.company || '').replace(/"/g, '""');
      const phone = (c.phone || '').replace(/"/g, '""');
      const total = c.totalSpent || 0;
      const count = c.ordersCount || 0;
      const lastSeen = c.lastSeenAt || '';
      const created = c.createdAt || '';

      csv += `"${c.userId}","${name}","${email}","${comp}","${phone}",${total},${count},"${lastSeen}","${created}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_dambru_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Crear cliente
  const handleCreateCustomer = async (data: {
    email: string;
    displayName: string;
    company?: string;
    phone?: string;
    bio?: string;
  }): Promise<boolean> => {
    setCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'No se pudo crear el cliente.');
      }

      setFeedback({ type: 'success', message: 'Cliente registrado exitosamente.' });
      await loadCustomers(true);
      return true;
    } catch (err) {
      console.error('Error creating customer:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al registrar el cliente.',
      });
      return false;
    } finally {
      setCreating(false);
    }
  };

  // Guardar edición de cliente
  const handleSaveCustomer = async (updated: Partial<Customer>): Promise<boolean> => {
    if (!updated.userId) return false;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'No se pudieron actualizar los datos del cliente.');
      }

      setFeedback({ type: 'success', message: 'Datos del cliente actualizados con éxito.' });
      await loadCustomers(true);
      return true;
    } catch (err) {
      console.error('Error updating customer:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al actualizar el cliente.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Feedback Global */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error de Conexión */}
      {error && (
        <div className="p-4 rounded-xl text-sm bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadCustomers(true)}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Resumen de Métricas SaaS */}
      <CustomersKpiSummary metrics={metrics} loading={loading} />

      {/* Barra de Filtros y Búsqueda */}
      <CustomersToolbar
        search={search}
        onSearchChange={setSearch}
        segmentFilter={segmentFilter}
        onSegmentChange={setSegmentFilter}
        metrics={metrics}
        onExportCsv={handleExportCsv}
        onNewCustomer={() => setCreateOpen(true)}
        onRefresh={() => loadCustomers(true)}
        refreshing={refreshing}
        totalFiltered={filteredCustomers.length}
      />

      {/* Tabla de Clientes */}
      <CustomersTable
        customers={filteredCustomers}
        loading={loading}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        onClearFilters={() => {
          setSearch('');
          setSegmentFilter('all');
        }}
      />

      {/* Diálogo de Ficha Detallada */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSaveCustomer={handleSaveCustomer}
        saving={saving}
      />

      {/* Diálogo de Alta de Cliente */}
      <CustomerCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreateCustomer={handleCreateCustomer}
        creating={creating}
      />
    </div>
  );
}
