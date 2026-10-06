"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function DashboardSection() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(err => setError(err.message));
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

      <div className="admin-stats">
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Ingresos Totales</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>${stats.totalRevenue.toLocaleString('es-UY')}</strong>
          <div style={{ fontSize: '11px', color: 'var(--action)', fontWeight: 600 }}>Desde el inicio</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Pedidos Pendientes</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>{stats.pendingOrders}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Requieren atención</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Usuarios Registrados</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0', display: 'block' }}>{stats.users}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Clientes y empresas</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Estado del Sistema</span>
          <strong style={{ fontSize: '28px', color: '#10b981', margin: '8px 0', display: 'block' }}>En línea</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Base de datos D1 conectada</div>
        </div>
      </div>

      <div style={{ marginTop: '30px', background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: '8px', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 20px' }}>Órdenes Recientes</h2>
        <div className="table-scroll">
          <table className="registry-table" style={{ width: '100%', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)' }}>ID</th>
                <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)' }}>Monto</th>
                <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)' }}>Estado</th>
                <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)', color: 'var(--soft)' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o: any) => (
                <tr key={o.created_at}>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>Orden</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>${o.total.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>
                    <span className="account-status active" style={{ background: o.status === 'pending' ? '#f59e0b20' : '#10b98120', color: o.status === 'pending' ? '#d97706' : '#059669', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
