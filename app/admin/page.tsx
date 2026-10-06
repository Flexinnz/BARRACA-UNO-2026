import { getChatGPTUser } from '../chatgpt-auth';
import { isCompanyAdmin } from '../../lib/accounts';
import { profileDb } from '../../db/profiles';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await getChatGPTUser();
  if (!user || !isCompanyAdmin(user)) {
    return (
      <main className="admin-main">
        <div className="account-empty">
          <div className="login-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2>Acceso Restringido</h2>
          <p>Solo los administradores pueden ver el dashboard de la empresa.</p>
        </div>
      </main>
    );
  }

  const db = profileDb();
  
  // Fetch high level stats
  const orders = await db.prepare('SELECT status, total, created_at FROM orders ORDER BY created_at DESC').all<{status: string, total: number, created_at: string}>();
  const profiles = await db.prepare('SELECT COUNT(*) as count FROM profiles').first<{count: number}>();
  
  const totalRevenue = orders.results.reduce((acc, o) => acc + o.total, 0);
  const pendingOrders = orders.results.filter(o => o.status === 'pending').length;
  
  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <h1>Dashboard Empresarial</h1>
          <span className="admin-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Administración Segura
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/pedidos-admin" className="primary">Gestión de Pedidos</a>
          <a href="/stock" className="primary" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--edge)' }}>Inventario</a>
        </div>
      </div>

      <div className="admin-stats">
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Ingresos Totales</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0' }}>${totalRevenue.toLocaleString('es-UY')}</strong>
          <div style={{ fontSize: '11px', color: 'var(--action)', fontWeight: 600 }}>Desde el inicio</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Pedidos Pendientes</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0' }}>{pendingOrders}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Requieren atención</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Usuarios Registrados</span>
          <strong style={{ fontSize: '28px', color: 'var(--ink)', margin: '8px 0' }}>{profiles?.count || 0}</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Clientes y empresas</div>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--soft)' }}>Estado del Sistema</span>
          <strong style={{ fontSize: '28px', color: '#10b981', margin: '8px 0' }}>En línea</strong>
          <div style={{ fontSize: '11px', color: 'var(--soft)' }}>Base de datos D1 conectada</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '30px' }}>
        
        {/* Recientes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 20px' }}>Órdenes Recientes</h2>
          <div className="table-scroll">
            <table className="registry-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)' }}>ID</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)' }}>Monto</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)' }}>Estado</th>
                  <th style={{ background: 'transparent', padding: '10px 16px', borderBottom: '1px solid var(--edge)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.results.slice(0, 5).map(o => (
                  <tr key={o.created_at}>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>Orden</td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>${o.total.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', borderTop: '1px solid var(--edge)' }}>
                      <span className="account-status active" style={{ background: o.status === 'pending' ? '#f59e0b20' : '#10b98120', color: o.status === 'pending' ? '#d97706' : '#059669' }}>
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

        {/* Accesos Rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a href="/cuenta" style={{ background: 'var(--surface)', border: '1px solid var(--edge)', padding: '20px', borderRadius: '8px', display: 'block', color: 'var(--ink)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 5px' }}>Clientes y Usuarios</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--soft)' }}>Gestiona los accesos y registros.</p>
          </a>
          <a href="/pedidos-admin" style={{ background: 'var(--surface)', border: '1px solid var(--edge)', padding: '20px', borderRadius: '8px', display: 'block', color: 'var(--ink)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 5px' }}>Órdenes</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--soft)' }}>Cambiar estados y ver detalles.</p>
          </a>
          <a href="/admin/products" style={{ background: 'var(--surface)', border: '1px solid var(--edge)', padding: '20px', borderRadius: '8px', display: 'block', color: 'var(--ink)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 5px', color: 'var(--action)' }}>Administración de mercadería</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--soft)' }}>Agregar productos, fotos, precios e impuestos.</p>
          </a>
          <a href="/stock" style={{ background: 'var(--surface)', border: '1px solid var(--edge)', padding: '20px', borderRadius: '8px', display: 'block', color: 'var(--ink)' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 5px' }}>Movimientos de Stock</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--soft)' }}>Registrar entradas, salidas y conteos del depósito.</p>
          </a>
        </div>

      </div>
    </main>
  );
}
