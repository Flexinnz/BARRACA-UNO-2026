"use client";
import {BrandLogo} from '../brand-art';
import {useEffect,useState} from 'react';
import {ShoppingBag,Search,RefreshCw,ChevronDown,ChevronUp,MapPin,CreditCard,Phone,Package,Clock,CheckCircle2,Truck,XCircle,Check,X,StickyNote,User,Filter} from 'lucide-react';
import {useTheme,ThemeButton} from '../profile-panel';
import {Dialog} from '../modal';

interface Order{
  id:string;user_id:string;user_email:string;user_name:string;status:string;payment_method:string;
  shipping_address:string;shipping_city:string;shipping_phone:string;notes:string;
  subtotal:number;tax:number;total:number;created_at:string;items_summary:string;
}
interface OrderItem{id:number;order_id:string;product_id:number;product_name:string;product_sku:string;product_unit:string;quantity:number;unit_price:number;line_total:number}

const money = (v: number | undefined | null) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(v || 0);

const date = (v: string | undefined | null) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-UY', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Montevideo',
    }).format(d);
  } catch {
    return String(v || '—');
  }
};

const STATUS_CONFIG:{[k:string]:{label:string;color:string;icon:typeof Clock}}={
  pending:{label:'Pendiente',color:'amber',icon:Clock},
  approved:{label:'Aprobado',color:'blue',icon:CheckCircle2},
  shipped:{label:'En camino',color:'violet',icon:Truck},
  delivered:{label:'Entregado',color:'green',icon:Check},
  cancelled:{label:'Cancelado',color:'rose',icon:XCircle},
};

function StatusBadge({status}:{status:string}){
  const cfg=STATUS_CONFIG[status]||{label:status,color:'gray',icon:Clock};
  const Icon=cfg.icon;
  return <span className={`order-status-badge ${cfg.color}`}><Icon size={13}/>{cfg.label}</span>;
}

export function OrdersRegistry(){
  const {theme,setTheme}=useTheme();
  const [orders,setOrders]=useState<Order[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [selected,setSelected]=useState<Order|null>(null);
  const [items,setItems]=useState<OrderItem[]>([]);
  const [loadingItems,setLoadingItems]=useState(false);
  const [saving,setSaving]=useState(false);
  const [newStatus,setNewStatus]=useState('');
  const [successMsg,setSuccessMsg]=useState('');
  const [expanded,setExpanded]=useState<string|null>(null);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/orders?all=1',{cache:'no-store'});
      const d=await r.json() as {orders:Order[];error?:string};
      if(!r.ok)throw Error(d.error||'Error cargando pedidos');
      setOrders(d.orders);
    }catch(e){setError(e instanceof Error?e.message:'Error desconocido');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  const openOrder=async(o:Order)=>{
    setSelected(o);setNewStatus(o.status);setSuccessMsg('');
    setLoadingItems(true);
    try{
      const r=await fetch(`/api/orders/${o.id}`);
      const d=await r.json() as {items:OrderItem[]};
      setItems(d.items||[]);
    }catch{setItems([]);}
    finally{setLoadingItems(false);}
  };

  const saveStatus=async()=>{
    if(!selected)return;setSaving(true);
    try{
      const r=await fetch(`/api/orders/${selected.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})});
      if(!r.ok)throw Error('No se pudo actualizar');
      setOrders(prev=>prev.map(o=>o.id===selected.id?{...o,status:newStatus}:o));
      setSelected(prev=>prev?{...prev,status:newStatus}:prev);
      setSuccessMsg('Estado actualizado correctamente.');
      setTimeout(()=>setSuccessMsg(''),3000);
    }catch(e){setError(e instanceof Error?e.message:'Error al guardar');}
    finally{setSaving(false);}
  };

  const filtered=orders.filter(o=>(statusFilter==='all'||o.status===statusFilter)&&
    `${o.id} ${o.user_email} ${o.user_name} ${o.shipping_city}`.toLowerCase().includes(query.toLowerCase()));

  const stats={
    total:orders.length,
    pending:orders.filter(o=>o.status==='pending').length,
    approved:orders.filter(o=>o.status==='approved').length,
    shipped:orders.filter(o=>o.status==='shipped').length,
    delivered:orders.filter(o=>o.status==='delivered').length,
  };

  return (
    <div className="admin-page">
      <header className="account-page-header">
        <a className="account-logo" href="/"><BrandLogo/></a>
        <nav className="admin-nav-links">
          <a href="/administracion">Cuentas</a>
          <a href="/pedidos-admin" className="active">Pedidos</a>
          <a href="/stock">Stock</a>
        </nav>
        <a className="back-catalog" href="/">Volver al catálogo</a>
        <ThemeButton theme={theme} setTheme={setTheme}/>
      </header>

      <main className="admin-main">
        <div className="admin-title">
          <div>
            <div className="eyebrow">BARRACA UNO / ADMINISTRACIÓN</div>
            <h1>Pedidos entrantes.</h1>
            <p>Gestioná los pedidos, verificá pagos y coordiná envíos.</p>
          </div>
          <span className="admin-badge"><ShoppingBag size={16}/>Pedidos</span>
        </div>

        <section className="admin-stats orders-stats">
          <div><Package size={20}/><strong>{stats.total}</strong><span>Total</span></div>
          <div className="amber-stat"><Clock size={18}/><strong>{stats.pending}</strong><span>Pendientes</span></div>
          <div className="blue-stat"><CheckCircle2 size={18}/><strong>{stats.approved}</strong><span>Aprobados</span></div>
          <div className="violet-stat"><Truck size={18}/><strong>{stats.shipped}</strong><span>En camino</span></div>
          <div className="green-stat"><Check size={18}/><strong>{stats.delivered}</strong><span>Entregados</span></div>
        </section>

        <div className="registry-controls">
          <label className="registry-search">
            <Search size={18}/>
            <input aria-label="Buscar pedidos" placeholder="Buscar por N° de orden, cliente, ciudad…" value={query} onChange={e=>setQuery(e.target.value)}/>
          </label>
          <label className="sr-only" htmlFor="orders-status-filter">Estado</label>
          <select id="orders-status-filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="secondary" onClick={()=>void load()} disabled={loading} aria-label="Actualizar"><RefreshCw size={17}/></button>
        </div>

        {error&&<p className="admin-error" role="alert">{error} <button onClick={()=>void load()}>Reintentar</button></p>}

        <div className="orders-list">
          {loading&&<p className="registry-empty" role="status">Cargando pedidos…</p>}
          {!loading&&!filtered.length&&<p className="registry-empty">No hay pedidos con estos filtros.</p>}
          {filtered.map(o=>{
            const isOpen=expanded===o.id;
            return (
              <div key={o.id} className={`order-card ${o.status}`}>
                <div className="order-card-head" onClick={()=>setExpanded(isOpen?null:o.id)}>
                  <div className="order-card-id">
                    <ShoppingBag size={16}/>
                    <strong>{o.id}</strong>
                    <StatusBadge status={o.status}/>
                  </div>
                  <div className="order-card-meta">
                    <span><User size={13}/>{o.user_name||o.user_email}</span>
                    <span><MapPin size={13}/>{o.shipping_city}</span>
                    <span><CreditCard size={13}/>{o.payment_method}</span>
                    <strong className="order-total">{money(o.total)}</strong>
                    <time>{date(o.created_at)}</time>
                    {isOpen?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                  </div>
                </div>
                {isOpen&&(
                  <div className="order-card-body">
                    <div className="order-details-grid">
                      <div className="order-detail-block">
                        <h4><MapPin size={14}/>Datos de envío</h4>
                        <p>{o.shipping_address}</p>
                        <p>{o.shipping_city}</p>
                        <p><Phone size={12}/>{o.shipping_phone}</p>
                      </div>
                      <div className="order-detail-block">
                        <h4><User size={14}/>Cliente</h4>
                        <p>{o.user_name}</p>
                        <p className="subtle">{o.user_email}</p>
                      </div>
                      <div className="order-detail-block">
                        <h4><CreditCard size={14}/>Pago</h4>
                        <p>{o.payment_method}</p>
                      </div>
                      {o.notes&&<div className="order-detail-block">
                        <h4><StickyNote size={14}/>Notas</h4>
                        <p>{o.notes}</p>
                      </div>}
                    </div>
                    <div className="order-items-preview">
                      <h4><Package size={14}/>Productos pedidos</h4>
                      <p className="order-items-list">{o.items_summary ? o.items_summary.split('|').join(' · ') : 'Sin detalle'}</p>
                    </div>
                    <div className="order-card-footer">
                      <div className="order-totals-mini">
                        <span>Subtotal: {money(o.subtotal)}</span>
                        <span>IVA: {money(o.tax)}</span>
                        <strong>Total: {money(o.total)}</strong>
                      </div>
                      <div className="order-status-change">
                        <button className="secondary" onClick={()=>openOrder(o)}>
                          <Filter size={15}/>Gestionar en detalle
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {selected&&(
        <Dialog label={`Pedido ${selected.id}`} onClose={()=>setSelected(null)}>
          <div className="order-detail-modal">
            <div className="modal-order-header">
              <span className="eyebrow">BARRACA UNO / PEDIDO</span>
              <h2>{selected.id}</h2>
              <StatusBadge status={selected.status}/>
            </div>

            <div className="order-details-grid">
              <div className="order-detail-block">
                <h4><User size={14}/>Cliente</h4>
                <p><strong>{selected.user_name}</strong></p>
                <p className="subtle">{selected.user_email}</p>
              </div>
              <div className="order-detail-block">
                <h4><MapPin size={14}/>Envío</h4>
                <p>{selected.shipping_address}</p>
                <p>{selected.shipping_city}</p>
                <p><Phone size={12}/>{selected.shipping_phone}</p>
              </div>
              <div className="order-detail-block">
                <h4><CreditCard size={14}/>Método de pago</h4>
                <p>{selected.payment_method}</p>
              </div>
              {selected.notes&&<div className="order-detail-block">
                <h4><StickyNote size={14}/>Notas del cliente</h4>
                <p>{selected.notes}</p>
              </div>}
            </div>

            <div className="order-items-table-wrap">
              <h4><Package size={14}/>Productos</h4>
              {loadingItems?<p>Cargando productos…</p>:(
                <table className="order-items-table">
                  <thead><tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>P. Unit.</th><th>Total</th></tr></thead>
                  <tbody>
                    {items.map(i=>(
                      <tr key={i.id}>
                        <td><strong>{i.product_name}</strong></td>
                        <td><code>{i.product_sku}</code></td>
                        <td>{i.quantity} {i.product_unit}</td>
                        <td>{money(i.unit_price)}</td>
                        <td><strong>{money(i.line_total)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={4}>Subtotal</td><td>{money(selected.subtotal)}</td></tr>
                    <tr><td colSpan={4}>IVA (22%)</td><td>{money(selected.tax)}</td></tr>
                    <tr className="order-total-row"><td colSpan={4}><strong>Total</strong></td><td><strong>{money(selected.total)}</strong></td></tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="order-status-editor">
              <h4>Cambiar estado del pedido</h4>
              <div className="status-editor-controls">
                <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <button className="primary" onClick={()=>void saveStatus()} disabled={saving||newStatus===selected.status}>
                  {saving?'Guardando…':<><Check size={16}/>Guardar estado</>}
                </button>
              </div>
              {successMsg&&<p className="admin-success">{successMsg}</p>}
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={()=>setSelected(null)}><X size={15}/>Cerrar</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
