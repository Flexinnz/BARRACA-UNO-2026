"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface DashboardRecentOrder {
  id: string;
  status: string;
  total: number;
  created_at: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  pendingOrders: number;
  users: number;
  recentOrders: DashboardRecentOrder[];
  error?: string;
}

export function DashboardSection() {
  const [stats, setStats] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json() as Promise<DashboardMetrics>)
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <div style={{ padding: 40 }}><p className="admin-error">Error cargando dashboard: {error}</p></div>;
  }
  if (!stats) {
    return <div style={{ padding: 40, color: 'var(--soft)' }}>Cargando métricas...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <div className="admin-title" style={{ marginBottom: 30 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--action)', fontWeight: 700, letterSpacing: 1, fontSize: 11, marginBottom: 8 }}>BARRACA UNO</div>
          <h1 style={{ fontSize: 32, margin: 0, color: 'var(--ink)' }}>Dashboard Empresarial</h1>
          <span className="admin-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <CheckCircle2 size={14} />
            Administración Segura
          </span>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--edge)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Ingresos Totales</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>${stats.totalRevenue.toLocaleString('es-UY')}</strong>
          <div style={{ fontSize: '11px', color: 'var(--action)', fontWeight: 600 }}>↑ 12% vs mes anterior</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--edge)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Pedidos Pendientes</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>{stats.pendingOrders}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Requieren atención inmediata</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--edge)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Usuarios Registrados</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>{stats.users}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Clientes y empresas activas</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--edge)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Estado del Sistema</span>
          <strong style={{ fontSize: '28px', color: '#10b981', margin: '8px 0', display: 'block' }}>En línea</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Base de datos sincronizada</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Main Orders Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>Órdenes Recientes</h2>
            <a href="/pedidos-admin" style={{ fontSize: '13px', color: 'var(--action)', fontWeight: 600 }}>Ver todas &rarr;</a>
          </div>
          <div className="table-scroll">
            <table className="registry-table" style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)', fontWeight: 600 }}>ID del Pedido</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)', fontWeight: 600 }}>Monto Total</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)', fontWeight: 600 }}>Estado</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)', fontWeight: 600 }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o: any) => (
                  <tr key={o.created_at} onClick={() => window.location.href = '/pedidos-admin'} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)', fontWeight: 600, color: 'var(--action)' }}>{o.id}</td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>${o.total.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>
                      <span className="account-status active" style={{ background: o.status === 'pending' ? '#f59e0b20' : '#10b98120', color: o.status === 'pending' ? '#d97706' : '#059669', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)', color: 'var(--soft)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 16px', color: 'var(--ink)' }}>Metas Mensuales</h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--soft)' }}>Ventas (UYU)</span>
                <span style={{ fontWeight: 600 }}>75%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--edge)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '75%', height: '100%', background: 'var(--action)' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--soft)' }}>Nuevos Clientes</span>
                <span style={{ fontWeight: 600 }}>40%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--edge)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '40%', height: '100%', background: '#10b981' }} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 16px', color: 'var(--ink)' }}>Acciones Rápidas</h3>
            <button onClick={() => window.location.href = '/stock'} style={{ width: '100%', padding: '10px', background: 'var(--edge)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', textAlign: 'left' }}>📦 Ajustar inventario</button>
            <button onClick={() => window.location.href = '/clientes'} style={{ width: '100%', padding: '10px', background: 'var(--edge)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textAlign: 'left' }}>👥 Ver lista de clientes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
