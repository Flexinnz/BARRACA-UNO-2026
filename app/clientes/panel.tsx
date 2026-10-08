"use client";
import { useState, useEffect, useMemo } from 'react';
import { BrandLogo } from '../brand-art';
import { useTheme, ThemeButton, Avatar } from '../profile-panel';
import { 
  Users, Search, RefreshCw, Phone, Mail, ArrowUpRight, 
  ShoppingBag, Calendar, CheckCircle2, Clock, 
  Star, DollarSign, ArrowLeft, Download, X, ExternalLink
} from 'lucide-react';
import { Dialog } from '../modal';

interface ClientAccount {
  userId: string;
  email: string;
  displayName: string;
  company: string;
  phone?: string;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  isAdmin: boolean;
  totalSpent: number;
  ordersCount?: number;
  lastOrderAt?: string;
}

const money = (v: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(v);
const fmtDate = (v: string | undefined | null) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(d);
  } catch {
    return String(v || '—');
  }
};

function isConnectedToday(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 && date.getDate() === now.getDate();
  } catch {
    return false;
  }
}

function getClientSegment(client: ClientAccount): { label: string; class: string; icon: string } {
  if (client.totalSpent >= 5000) {
    return { label: 'Cliente VIP', class: 'vip', icon: '⭐' };
  }
  if ((client.ordersCount || 0) >= 2) {
    return { label: 'Recurrente', class: 'recurring', icon: '🔄' };
  }
  if ((client.ordersCount || 0) === 1) {
    return { label: 'Comprador', class: 'buyer', icon: '🛍️' };
  }
  return { label: 'Cliente Nuevo', class: 'new', icon: '✨' };
}

export function ClientesPanel() {
  const { theme, setTheme } = useTheme();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/accounts', { cache: 'no-store' });
      const data = await res.json() as { accounts: ClientAccount[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'No pudimos cargar los clientes.');
      setClients(data.accounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Filter non-admin accounts by default for client view
  const customerList = useMemo(() => {
    return clients.filter(c => !c.isAdmin);
  }, [clients]);

  // SaaS KPIs
  const kpis = useMemo(() => {
    const total = customerList.length;
    const connectedToday = customerList.filter(c => isConnectedToday(c.lastSeenAt)).length;
    const buyers = customerList.filter(c => (c.ordersCount || 0) > 0).length;
    const newClients = customerList.filter(c => (c.ordersCount || 0) === 0).length;
    const totalRevenue = customerList.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgTicket = buyers > 0 ? Math.round(totalRevenue / buyers) : 0;

    return { total, connectedToday, buyers, newClients, totalRevenue, avgTicket };
  }, [customerList]);

  // Filtering
  const filteredClients = useMemo(() => {
    return customerList.filter(c => {
      const q = query.toLowerCase();
      const matchesSearch = !q || 
        c.displayName.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) || 
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));

      if (!matchesSearch) return false;

      if (segmentFilter === 'today') return isConnectedToday(c.lastSeenAt);
      if (segmentFilter === 'new') return (c.ordersCount || 0) === 0;
      if (segmentFilter === 'buyers') return (c.ordersCount || 0) > 0;
      if (segmentFilter === 'vip') return c.totalSpent >= 5000;

      return true;
    });
  }, [customerList, query, segmentFilter]);

  const exportClientsCsv = () => {
    if (filteredClients.length === 0) return;
    let csv = 'Nombre,Correo,Empresa,Telefono,TotalGastado,Pedidos,UltimaConexion,FechaRegistro\n';
    filteredClients.forEach(c => {
      csv += `"${c.displayName}","${c.email}","${c.company || ''}","${c.phone || ''}","${c.totalSpent}","${c.ordersCount || 0}","${c.lastSeenAt}","${c.createdAt}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_barraca_uno_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page client-crm-page">
      <header className="account-page-header">
        <a className="account-logo" href="/"><BrandLogo /></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a className="back-catalog" href="/"><ArrowLeft size={16} /> Catálogo</a>
          <a className="back-catalog" href="/pedidos-admin"><ShoppingBag size={16} /> Pedidos</a>
          <a className="back-catalog" href="/stock">Stock</a>
          <ThemeButton theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <main className="admin-main">
        {/* Title & Badge */}
        <div className="admin-title">
          <div>
            <div className="eyebrow">BARRACA UNO / SaaS CRM</div>
            <h1>Gestión de Clientes.</h1>
            <p>Control de cartera, historial de compras, actividad en tiempo real y comunicación directa.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="secondary" onClick={exportClientsCsv} title="Descargar base de clientes en CSV">
              <Download size={16} /> Exportar Clientes
            </button>
            <button className="secondary" onClick={() => void load()} disabled={loading} title="Actualizar datos">
              <RefreshCw size={16} style={{ animation: loading ? 'spin 0.8s linear infinite' : undefined }} />
            </button>
          </div>
        </div>

        {/* SaaS Metrics Dashboard */}
        <section className="crm-metrics-grid">
          <div className="crm-metric-card">
            <div className="metric-header">
              <span>Total Clientes</span>
              <Users size={18} className="metric-icon text-blue" />
            </div>
            <strong>{kpis.total}</strong>
            <small>Cartera de clientes registrados</small>
          </div>

          <div className="crm-metric-card highlight-green">
            <div className="metric-header">
              <span>Conectados Hoy</span>
              <span className="live-pulse-dot" />
            </div>
            <strong className="text-green">{kpis.connectedToday}</strong>
            <small>Clientes con actividad en 24h</small>
          </div>

          <div className="crm-metric-card">
            <div className="metric-header">
              <span>Compradores Activos</span>
              <ShoppingBag size={18} className="metric-icon text-amber" />
            </div>
            <strong>{kpis.buyers}</strong>
            <small>{kpis.newClients} aún sin compras</small>
          </div>

          <div className="crm-metric-card highlight-accent">
            <div className="metric-header">
              <span>Facturación Clientes (LTV)</span>
              <DollarSign size={18} className="metric-icon text-indigo" />
            </div>
            <strong className="text-indigo">{money(kpis.totalRevenue)}</strong>
            <small>Promedio: {money(kpis.avgTicket)} / cliente</small>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="crm-toolbar">
          <div className="registry-search" style={{ flex: 1, maxWidth: '450px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email, empresa o teléfono..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="btn-clear-input" onClick={() => setQuery('')}>✕</button>
            )}
          </div>

          <div className="crm-filter-pills">
            <button 
              className={`pill-button ${segmentFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSegmentFilter('all')}
            >
              Todos ({customerList.length})
            </button>
            <button 
              className={`pill-button ${segmentFilter === 'today' ? 'active' : ''}`}
              onClick={() => setSegmentFilter('today')}
            >
              🟢 Conectados Hoy ({kpis.connectedToday})
            </button>
            <button 
              className={`pill-button ${segmentFilter === 'new' ? 'active' : ''}`}
              onClick={() => setSegmentFilter('new')}
            >
              ✨ Clientes Nuevos ({kpis.newClients})
            </button>
            <button 
              className={`pill-button ${segmentFilter === 'buyers' ? 'active' : ''}`}
              onClick={() => setSegmentFilter('buyers')}
            >
              🛍️ Compradores ({kpis.buyers})
            </button>
            <button 
              className={`pill-button ${segmentFilter === 'vip' ? 'active' : ''}`}
              onClick={() => setSegmentFilter('vip')}
            >
              ⭐ Clientes VIP
            </button>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        {/* CRM Customers Table */}
        <div className="table-scroll registry-table crm-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Empresa / Obra</th>
                <th>Contacto Directo</th>
                <th>Segmento</th>
                <th>Total Gastado (LTV)</th>
                <th>Pedidos</th>
                <th>Última Actividad</th>
                <th style={{ textAlign: 'right' }}>Ficha & Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => {
                const segment = getClientSegment(c);
                const online = isConnectedToday(c.lastSeenAt);
                const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');

                return (
                  <tr key={c.userId}>
                    <td>
                      <div className="crm-client-cell">
                        <Avatar profile={{ displayName: c.displayName, avatar: 'initials', accent: 'ocean' } as any} className="small" />
                        <div>
                          <strong>{c.displayName || 'Sin nombre'}</strong>
                          <small>{c.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.company ? (
                        <span className="company-badge">{c.company}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>Particular</span>
                      )}
                    </td>
                    <td>
                      <div className="crm-contact-links">
                        {c.phone ? (
                          <>
                            <a 
                              href={`https://wa.me/${cleanPhone.startsWith('0') ? '598' + cleanPhone.slice(1) : cleanPhone}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn-contact whatsapp"
                              title="Escribir por WhatsApp"
                            >
                              <Phone size={13} /> {c.phone}
                            </a>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sin teléfono</span>
                        )}
                        <a 
                          href={`mailto:${c.email}?subject=Contacto%20desde%20Barraca%20Uno`} 
                          className="btn-contact email"
                          title="Enviar correo electrónico"
                        >
                          <Mail size={13} />
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className={`segment-badge ${segment.class}`}>
                        {segment.icon} {segment.label}
                      </span>
                    </td>
                    <td>
                      <strong className="total-spent-number">
                        {money(c.totalSpent || 0)}
                      </strong>
                    </td>
                    <td>
                      <span className="orders-count-badge">
                        <ShoppingBag size={12} /> {c.ordersCount || 0} {c.ordersCount === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </td>
                    <td>
                      {online ? (
                        <span className="live-status-pill">
                          <span className="live-pulse-dot" /> Conectado hoy
                        </span>
                      ) : (
                        <span className="date-muted">{fmtDate(c.lastSeenAt)}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="secondary btn-sm" 
                        onClick={() => setSelectedClient(c)}
                        title="Ver ficha completa del cliente"
                      >
                        Ver Ficha <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <p className="registry-empty">Cargando base de clientes…</p>}
          {!loading && filteredClients.length === 0 && (
            <p className="registry-empty">No se encontraron clientes con los filtros seleccionados.</p>
          )}
        </div>
      </main>

      {/* Client Detail Modal */}
      {selectedClient && (
        <Dialog label={`Ficha de ${selectedClient.displayName}`} onClose={() => setSelectedClient(null)}>
          <div className="crm-modal-detail">
            <div className="crm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Avatar profile={{ displayName: selectedClient.displayName, avatar: 'initials', accent: 'ocean' } as any} className="large" />
                <div>
                  <h2>{selectedClient.displayName}</h2>
                  <p>{selectedClient.email}</p>
                </div>
              </div>
              <button className="icon-button" onClick={() => setSelectedClient(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="crm-modal-body">
              <div className="detail-stat-row">
                <div className="detail-stat-box">
                  <span>Segmento</span>
                  <strong>{getClientSegment(selectedClient).icon} {getClientSegment(selectedClient).label}</strong>
                </div>
                <div className="detail-stat-box">
                  <span>Total Invertido</span>
                  <strong className="text-green">{money(selectedClient.totalSpent || 0)}</strong>
                </div>
                <div className="detail-stat-box">
                  <span>Pedidos Totales</span>
                  <strong>{selectedClient.ordersCount || 0}</strong>
                </div>
                <div className="detail-stat-box">
                  <span>Actividad</span>
                  <strong>{isConnectedToday(selectedClient.lastSeenAt) ? '🟢 Conectado hoy' : fmtDate(selectedClient.lastSeenAt)}</strong>
                </div>
              </div>

              <div className="detail-info-section">
                <h3>Datos de Cuenta & Obra</h3>
                <div className="info-grid">
                  <div>
                    <label>Empresa / Constructora:</label>
                    <p>{selectedClient.company || 'Cliente Particular'}</p>
                  </div>
                  <div>
                    <label>Teléfono:</label>
                    <p>{selectedClient.phone || 'No registrado'}</p>
                  </div>
                  <div>
                    <label>Fecha de Registro:</label>
                    <p>{fmtDate(selectedClient.createdAt)}</p>
                  </div>
                  <div>
                    <label>Último Pedido:</label>
                    <p>{selectedClient.lastOrderAt ? fmtDate(selectedClient.lastOrderAt) : 'Sin pedidos aún'}</p>
                  </div>
                </div>
              </div>

              <div className="crm-modal-actions">
                {selectedClient.phone && (
                  <a 
                    href={`https://wa.me/${selectedClient.phone.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="primary" 
                    style={{ background: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Phone size={16} /> Contactar por WhatsApp
                  </a>
                )}
                <a 
                  href={`mailto:${selectedClient.email}`}
                  className="secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Mail size={16} /> Enviar Correo
                </a>
                <a 
                  href="/pedidos-admin" 
                  className="secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <ShoppingBag size={16} /> Ir a Gestión de Pedidos <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
