
"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog } from './modal';
import { BrandLogo, CityScape } from './brand-art';
import { GalleryProvider, useProductGallery } from './product-gallery';
import { useAccount, useTheme, ThemeButton, Avatar, AccountContent } from './profile-panel';
import { Package, Search, X, ShoppingCart, Bell, ChevronDown, Grid2X2, List, Plus, Minus, Trash2, Check, Building2, ArrowUpRight, Boxes, TriangleAlert, Paintbrush, Wrench, Zap, Droplets, Layers, FileText, CheckCircle2, Clock, Truck, XCircle, MapPin, CreditCard, Phone, StickyNote, ClipboardList, RefreshCw } from 'lucide-react';
import { Category, Product, OrderItem, names, categories, defaultProducts } from '../lib/catalog';

const money = (v: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(v);
const fmtDate = (v: string) => new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(new Date(v));
const icons: Record<string, typeof Package> = { 'Masonería': Layers, 'Hierros y Estructuras': Boxes, 'Herramientas': Wrench, 'Sanitaria': Droplets, 'Electricidad': Zap, 'Pinturería': Paintbrush };

// ── Cart ─────────────────────────────────────────────────────────────────────
function useCart(products: Product[]) {
  const [items, setItems] = useState<OrderItem[]>([]);
  useEffect(() => {
    setItems(old => old.flatMap(i => {
      const p = products.find(p => p.id === i.product.id);
      return p && p.stock > 0 ? [{ product: p, quantity: Math.min(p.stock, i.quantity) }] : [];
    }));
  }, [products]);
  const add = (p: Product, q: number) => setItems(old => old.some(i => i.product.id === p.id)
    ? old.map(i => i.product.id === p.id ? { ...i, quantity: Math.min(p.stock, i.quantity + q) } : i)
    : [...old, { product: p, quantity: Math.min(p.stock, q) }]);
  const update = (id: number, q: number) => setItems(old => old.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, Math.min(i.product.stock, Math.trunc(q) || 1)) } : i));
  const remove = (id: number) => setItems(old => old.filter(i => i.product.id !== id));
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  return { items, add, update, remove, clear: () => setItems([]), subtotal, tax: Math.round(subtotal * .22), total: subtotal + Math.round(subtotal * .22), count: items.reduce((s, i) => s + i.quantity, 0) };
}

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function useFilters(products: Product[]) {
  const [search, setSearch] = useState(''), [category, setCategory] = useState('Todas'), [stock, setStock] = useState('Todos'), [sort, setSort] = useState('Nombre (A-Z)');
  const filtered = useMemo(() => products.filter(p =>
    normalize(`${p.name} ${p.sku} ${p.brand}`).includes(normalize(search)) &&
    (category === 'Todas' || p.category === category) &&
    (stock === 'Todos' || (stock === 'Disponible' ? p.stock > 10 : stock === 'Stock Crítico' ? p.stock > 0 && p.stock <= 10 : p.stock === 0))
  ).sort((a, b) => sort === 'Menor Precio' ? a.price - b.price : sort === 'Mayor Precio' ? b.price - a.price : sort === 'Menor Stock' ? a.stock - b.stock : a.name.localeCompare(b.name)), [products, search, category, stock, sort]);
  return { search, setSearch, category, setCategory, stock, setStock, sort, setSort, filtered, reset: () => { setSearch(''); setCategory('Todas'); setStock('Todos'); setSort('Nombre (A-Z)') } };
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  pending:   { label: 'Pendiente de pago', color: 'amber',  Icon: Clock },
  approved:  { label: 'Aprobado',          color: 'blue',   Icon: CheckCircle2 },
  shipped:   { label: 'En camino',         color: 'violet', Icon: Truck },
  delivered: { label: 'Entregado',         color: 'green',  Icon: Check },
  cancelled: { label: 'Cancelado',         color: 'rose',   Icon: XCircle },
};
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: 'gray', Icon: Clock };
  return <span className={`order-status-badge ${c.color}`}><c.Icon size={13} />{c.label}</span>;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Quantity({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return <div className="quantity"><button aria-label={`Reducir ${label}`} disabled={value <= 1 || max === 0} onClick={() => onChange(value - 1)}><Minus size={14} /></button><input aria-label={`Cantidad de ${label}`} type="number" min="1" max={max} disabled={max === 0} value={value} onChange={e => onChange(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))} /><button aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={14} /></button></div>;
}
function Badge({ p }: { p: Product }) {
  return <span className={`status ${p.stock === 0 ? 'out' : p.stock <= 10 ? 'low' : 'good'}`}><span />{p.stock === 0 ? 'Agotado' : p.stock <= 10 ? 'Stock Bajo' : 'En Stock'}</span>;
}
function Visual({ p, small = false }: { p: Product; small?: boolean }) {
  const open = useProductGallery();
  return <button type="button" aria-label={`Ver fotos de ${p.name}`} onClick={() => open(p)} className={`product-visual photo ${small ? 'small' : ''}`}><img src={`/products/${p.id}.jpg`} alt={`Imagen ilustrativa de ${p.name}`} loading="lazy" />{!small && <span className="photo-brand">{p.brand}</span>}<span className="photo-expand">Ver fotos ↗</span></button>;
}
function ProductCard({ p, onAdd, table = false }: { p: Product; onAdd: (p: Product, q: number) => void; table?: boolean }) {
  const [q, setQ] = useState(1), [added, setAdded] = useState(false);
  useEffect(() => setQ(q => Math.max(1, Math.min(p.stock, q))), [p.stock]);
  const action = <button className={`primary add ${added ? 'added' : ''}`} disabled={!p.stock} onClick={() => { onAdd(p, q); setAdded(true); setTimeout(() => setAdded(false), 1500) }}>{added ? <Check size={16} /> : <Plus size={16} />} {added ? 'Agregado' : p.stock ? 'Agregar' : 'Sin stock'}</button>;
  const quantity = <Quantity value={q} max={p.stock} onChange={setQ} label={p.name} />;
  if (table) return <tr><td><div className="table-product"><Visual p={p} small /><div><strong>{p.name}</strong><small>{p.sku} · {p.brand}</small></div></div></td><td>{p.category}</td><td><Badge p={p} /><small>{p.stock} {p.unit}</small></td><td><strong>{money(p.price)}</strong><small>/ {p.unit}</small></td><td>{quantity}</td><td>{action}</td></tr>;
  return <article className="product-card"><div className="visual-wrap"><Visual p={p} /><span className="category-badge">{p.category}</span></div><div className="product-body"><div className="sku">{p.sku} <span>· {p.brand}</span></div><h3>{p.name}</h3><div className="stock-line"><Badge p={p} /><span>{p.stock.toLocaleString('es-UY')} {p.unit}</span></div><div className="price-line"><strong>{money(p.price)}</strong><span>/ {p.unit}</span><span className="currency">UYU</span></div><div className="card-action">{quantity}{action}</div></div></article>;
}

// ── My Orders panel ───────────────────────────────────────────────────────────
interface UserOrder { id: string; status: string; payment_method: string; shipping_address: string; shipping_city: string; total: number; created_at: string; items_summary: string; }
function MyOrders({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/orders', { cache: 'no-store' });
      const d = await r.json() as { orders: UserOrder[]; error?: string };
      if (!r.ok) throw Error(d.error || 'No pudimos cargar tus pedidos.');
      setOrders(d.orders);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <Dialog label="Mis pedidos" onClose={onClose}>
      <div className="my-orders-panel">
        <div className="drawer-head">
          <div><span className="eyebrow">BARRACA UNO</span><h2>Mis pedidos</h2><p>Historial y estado de tus órdenes de compra</p></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary icon-only" aria-label="Actualizar" onClick={() => void load()}><RefreshCw size={16} /></button>
            <button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button>
          </div>
        </div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading && <p className="orders-loading"><Clock size={20} /> Cargando pedidos…</p>}
        {!loading && !orders.length && (
          <div className="empty"><ClipboardList size={44} /><h3>Todavía no tenés pedidos</h3><p>Cuando hagas una orden va a aparecer acá con su estado en tiempo real.</p></div>
        )}
        {orders.map(o => {
          const cfg = STATUS_CFG[o.status] || STATUS_CFG.pending;
          return (
            <div key={o.id} className={`my-order-card ${o.status}`}>
              <div className="my-order-head">
                <div className="my-order-id"><FileText size={15} /><strong>{o.id}</strong></div>
                <StatusBadge status={o.status} />
              </div>
              <div className="my-order-meta">
                <span><MapPin size={13} />{o.shipping_city}</span>
                <span><CreditCard size={13} />{o.payment_method}</span>
                <strong className="my-order-total">{money(o.total)}</strong>
                <time>{fmtDate(o.created_at)}</time>
              </div>
              {o.items_summary && (
                <p className="my-order-items">{o.items_summary.split('|').join(' · ')}</p>
              )}
              <div className={`order-progress ${o.status}`}>
                {['pending', 'approved', 'shipped', 'delivered'].map((s, idx) => {
                  const steps = ['pending', 'approved', 'shipped', 'delivered'];
                  const currentIdx = steps.indexOf(o.status);
                  const done = idx <= currentIdx && o.status !== 'cancelled';
                  const c2 = STATUS_CFG[s];
                  return <div key={s} className={`progress-step ${done ? 'done' : ''}`}><span><c2.Icon size={13} /></span><small>{c2.label.split(' ')[0]}</small></div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

// ── Checkout form ─────────────────────────────────────────────────────────────
interface CheckoutForm { paymentMethod: string; shippingAddress: string; shippingCity: string; shippingPhone: string; notes: string; }
function CheckoutModal({ cart, account, onSuccess, onBack }: {
  cart: ReturnType<typeof useCart>;
  account: ReturnType<typeof useAccount>;
  onSuccess: (id: string) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState<CheckoutForm>({ paymentMethod: '', shippingAddress: '', shippingCity: '', shippingPhone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (!account.authenticated) { setError('Necesitás iniciar sesión para hacer un pedido.'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        items: cart.items.map(i => ({ productId: i.product.id, productName: i.product.name, productSku: i.product.sku, productUnit: i.product.unit, quantity: i.quantity, unitPrice: i.product.price })),
        ...form,
      };
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json() as { orderId?: string; error?: string };
      if (!r.ok) throw Error(d.error || 'No pudimos procesar tu pedido.');
      cart.clear();
      onSuccess(d.orderId!);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al enviar el pedido.'); }
    finally { setSubmitting(false); }
  };
  return (
    <Dialog label="Finalizar pedido" onClose={onBack}>
      <div className="checkout-modal">
        <div className="drawer-head">
          <div><span className="eyebrow">BARRACA UNO / CHECKOUT</span><h2>Completá tu pedido</h2><p>{cart.items.length} productos · {money(cart.total)}</p></div>
          <button className="icon-button" aria-label="Volver" onClick={onBack}><X /></button>
        </div>

        {!account.authenticated && (
          <div className="checkout-auth-warning"><TriangleAlert size={18} /><span>Necesitás <a href="/ingresar">iniciar sesión</a> para completar el pedido.</span></div>
        )}

        <div className="checkout-sections">
          {/* Resumen */}
          <section className="checkout-section">
            <h3><ShoppingCart size={16} />Resumen del pedido</h3>
            <div className="checkout-items">
              {cart.items.map(i => (
                <div key={i.product.id} className="checkout-item-row">
                  <span>{i.quantity} × {i.product.name}</span>
                  <strong>{money(i.quantity * i.product.price)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <div><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
              <div><span>IVA (22%)</span><span>{money(cart.tax)}</span></div>
              <div className="checkout-total-line"><strong>Total</strong><strong>{money(cart.total)}</strong></div>
            </div>
          </section>

          {/* Envío */}
          <section className="checkout-section">
            <h3><MapPin size={16} />Datos de envío</h3>
            <div className="checkout-fields">
              <label><span>Dirección</span><input type="text" placeholder="Ej: Av. 18 de Julio 1234" value={form.shippingAddress} onChange={set('shippingAddress')} required /></label>
              <label><span>Ciudad / Departamento</span><input type="text" placeholder="Ej: Montevideo" value={form.shippingCity} onChange={set('shippingCity')} required /></label>
              <label><span>Teléfono de contacto</span><input type="tel" placeholder="Ej: 099 123 456" value={form.shippingPhone} onChange={set('shippingPhone')} required /></label>
            </div>
          </section>

          {/* Pago */}
          <section className="checkout-section">
            <h3><CreditCard size={16} />Método de pago</h3>
            <div className="payment-options">
              {['Efectivo', 'Transferencia bancaria', 'Cheque', 'Tarjeta de débito', 'Tarjeta de crédito'].map(m => (
                <label key={m} className={`payment-option ${form.paymentMethod === m ? 'selected' : ''}`}>
                  <input type="radio" name="payment" value={m} checked={form.paymentMethod === m} onChange={set('paymentMethod')} />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Notas */}
          <section className="checkout-section">
            <h3><StickyNote size={16} />Notas adicionales <small>(opcional)</small></h3>
            <textarea placeholder="Instrucciones especiales, horario de entrega, etc." value={form.notes} onChange={set('notes')} rows={3} />
          </section>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <div className="checkout-actions">
          <button className="secondary" onClick={onBack} disabled={submitting}>← Volver al carrito</button>
          <button className="primary generate" onClick={() => void submit()} disabled={submitting || !account.authenticated || !form.paymentMethod || !form.shippingAddress || !form.shippingCity || !form.shippingPhone}>
            {submitting ? 'Enviando…' : <><CheckCircle2 size={18} /> Confirmar pedido</>}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home({ initialProducts = defaultProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState(initialProducts), [stockError, setStockError] = useState(''), [stockRefreshing, setStockRefreshing] = useState(false);
  const f = useFilters(products), cart = useCart(products), account = useAccount();

  // Live stock refresh
  const manualRefresh = useCallback(async () => {
    setStockRefreshing(true); setStockError('');
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json() as { error?: string; products: Product[] };
      if (!response.ok) throw Error(data.error || 'No pudimos actualizar el stock.');
      setProducts(data.products);
    } catch (e) { setStockError(e instanceof Error ? e.message : 'No pudimos actualizar el stock.') }
    finally { setStockRefreshing(false); }
  }, []);

  useEffect(() => {
    if (!account.authenticated) return;
    let alive = true, inFlight = false;
    const refresh = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        const data = await response.json() as { error?: string; products: Product[] };
        if (!response.ok) throw Error(data.error || 'No pudimos actualizar el stock.');
        if (alive) { setProducts(old => JSON.stringify(old) === JSON.stringify(data.products) ? old : data.products); setStockError('') }
      } catch (e) { if (alive) setStockError(e instanceof Error ? e.message : 'No pudimos actualizar el stock.') }
      finally { inFlight = false }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [account.authenticated]);

  const { theme, setTheme } = useTheme();
  const [profilePanel, setProfilePanel] = useState(false);
  const [view, setView] = useState('grid');
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [myOrders, setMyOrders] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; total: number } | null>(null);
  const [profile, setProfile] = useState(false);
  const [toast, setToast] = useState('');

  const add = (p: Product, q: number) => { cart.add(p, q); setDrawer(true); setToast(`${p.name} agregado a la orden`) };
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) } }, [toast]);

  // MCP tool registration
  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options: unknown) => void } }).modelContext;
    if (!context) return;
    const life = new AbortController();
    try {
      context.registerTool({ name: 'search_inventory', description: 'Filter the visible inventory by material, SKU or brand.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: unknown) => { const query = (input as { query?: unknown }).query; if (typeof query !== 'string') throw Error('query must be a string'); f.setSearch(query); return { query } } }, { signal: life.signal });
    } catch { }
    return () => life.abort();
  }, []);

  return (
    <GalleryProvider>
      {/* ── Header ── */}
      <header className="header">
        <a className="brand" href="/" aria-label="Barraca Uno inicio"><span className="real-logo"><BrandLogo /></span><span className="brand-divider" /><span className="brand-context">Barraca<small>Inventario y compras</small></span></a>
        <div className="global-search"><Search size={19} /><input aria-label="Buscar productos" placeholder="Buscar por material, código SKU, marca..." value={f.search} onChange={e => f.setSearch(e.target.value)} />{f.search && <button aria-label="Limpiar búsqueda" onClick={() => f.setSearch('')}><X size={16} /></button>}</div>
        <div className="header-actions">
          <button className="alert-button" aria-label="Ver alertas de stock" onClick={() => { f.setStock('Stock Crítico'); f.setCategory('Todas') }}><Bell size={21} /><span className="alert-dot">{products.filter(p => p.stock > 0 && p.stock <= 10).length}</span></button>
          <button className="theme-button" aria-label="Actualizar stock" title="Actualizar stock" onClick={() => void manualRefresh()} disabled={stockRefreshing} style={{ color: stockRefreshing ? 'var(--accent-line)' : undefined }}><RefreshCw size={19} style={{ animation: stockRefreshing ? 'spin 0.8s linear infinite' : undefined }} /></button>
          {account.authenticated && (
            <button className="orders-trigger" onClick={() => setMyOrders(true)} title="Mis pedidos"><ClipboardList size={20} /><span>Mis pedidos</span></button>
          )}
          <button className="cart-trigger" onClick={() => setDrawer(true)}><span className="cart-icon"><ShoppingCart size={21} />{cart.count > 0 && <b>{cart.count}</b>}</span><span>Mi orden<small>{money(cart.total)}</small></span></button>
          <ThemeButton theme={theme} setTheme={setTheme} />
          <div className="profile-wrap">
            <button className="profile" aria-label="Menú de usuario" aria-expanded={profile} onClick={() => setProfile(!profile)}><Avatar profile={account.profile} /><ChevronDown size={14} /></button>
            {profile && <div className="profile-menu">
              <strong>{account.loading ? 'Cargando cuenta…' : account.profile?.displayName || 'Tu cuenta'}</strong>
              <small>{account.profile?.email || 'Entrá y personalizá tu espacio'}</small>
              <hr />
              <button onClick={() => { setProfile(false); setProfilePanel(true) }}>{account.authenticated ? 'Personalizar mi perfil' : 'Iniciar sesión'}</button>
              <a href="/cuenta">Mi cuenta</a>
              {account.authenticated && <button onClick={() => { setProfile(false); setMyOrders(true) }}><ClipboardList size={15} />Mis pedidos</button>}
              {account.isAdmin && <><a href="/stock">Control de stock</a><a href="/administracion">Administrar cuentas</a><a href="/pedidos-admin">Gestión de pedidos</a></>}
              <a href="/locales">Nuestros locales</a>
              <a href="/guia">Cómo usar Barraca Uno</a>
              {account.authenticated && <a href="/auth/logout" target="_top">Cerrar sesión</a>}
            </div>}
          </div>
        </div>
      </header>

      {/* ── Shell ── */}
      <div className="app-shell">
        <aside className="sidebar">
          <div className="side-label">BARRACA</div>
          <div className="side-active"><Package size={19} /> Inventario <span>{products.length}</span></div>
          {account.isAdmin && <a href="/stock" className="cat-link stock-nav"><Boxes size={17} />Control de stock <Plus size={15} /></a>}
          {account.isAdmin && <a href="/pedidos-admin" className="cat-link"><ClipboardList size={17} />Gestión de pedidos</a>}
          <a href="/locales" className="cat-link"><Building2 size={17} />Nuestros locales</a>
          <div className="side-label category-label">CATEGORÍAS</div>
          <button className={`cat-link ${f.category === 'Todas' ? 'selected' : ''}`} onClick={() => f.setCategory('Todas')}><Grid2X2 size={17} />Todos los materiales<span>{products.length}</span></button>
          {categories.map(c => { const Icon = icons[c.name]; return <button key={c.id} className={`cat-link ${f.category === c.name ? 'selected' : ''}`} onClick={() => f.setCategory(c.name)}><Icon size={17} />{c.name}<span>{products.filter(p => p.category === c.name).length}</span></button> })}
          <div className="sidebar-note"><CityScape /><span className="note-icon"><Building2 size={20} /></span><strong>Uno para todos.</strong><span>De la barraca a tu obra.</span><div><span className="live-dot" /> Stock sincronizado</div></div>
          <div className="sidebar-footer">BARRACA UNO <span>v2.0</span></div>
        </aside>

        <main>
          <div className="breadcrumb">Espacio de trabajo <span>/</span> <b>Inventario</b></div>
          <div className="page-heading"><CityScape className="heading-city" /><div><div className="eyebrow">BARRACA UNO / MATERIALES</div><h1>Manos a la obra.</h1><p>Buscá el material. Revisá el stock. Armá tu pedido.</p></div><button className="primary order-button" onClick={() => setDrawer(true)}><ShoppingCart size={18} /> Ver mi orden {cart.count > 0 && <b>{cart.count}</b>}</button></div>

          {stockError && <p className="admin-error" role="alert">{stockError} Actualizá la página para reintentar.</p>}

          <section className="stats" aria-label="Resumen de inventario">
            <div><span className="stat-icon blue"><Boxes size={22} /></span><div><small>Materiales en catálogo</small><strong>{products.length}<span>productos</span></strong></div></div>
            <div><span className="stat-icon green"><CheckCircle2 size={22} /></span><div><small>Stock disponible</small><strong>{products.filter(p => p.stock > 10).length}<span>en stock</span></strong></div></div>
            <button onClick={() => { f.setStock('Stock Crítico'); f.setCategory('Todas') }}><span className="stat-icon amber"><TriangleAlert size={22} /></span><div><small>Para reponer</small><strong>{products.filter(p => p.stock > 0 && p.stock <= 10).length}<span>con stock bajo</span></strong></div><ArrowUpRight size={17} /></button>
            <div><span className="stat-icon rose"><Package size={22} /></span><div><small>Sin disponibilidad</small><strong>{products.filter(p => p.stock === 0).length}<span>agotados</span></strong></div></div>
          </section>

          <section className="catalog">
            <div className="catalog-heading"><div><h2>El catálogo de la barraca</h2><span>{f.filtered.length} productos encontrados</span></div><div className="price-info">Precios en UYU <span>·</span> IVA no incluido</div></div>
            <div className="toolbar">
              <label><span>Categoría</span><select value={f.category} onChange={e => f.setCategory(e.target.value)}><option>Todas</option>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label>
              <label><span>Estado de stock</span><select value={f.stock} onChange={e => f.setStock(e.target.value)}>{['Todos', 'Disponible', 'Stock Crítico', 'Agotado'].map(s => <option key={s}>{s}</option>)}</select></label>
              <label className="sort"><span>Ordenar por</span><select value={f.sort} onChange={e => f.setSort(e.target.value)}>{['Nombre (A-Z)', 'Menor Precio', 'Mayor Precio', 'Menor Stock'].map(s => <option key={s}>{s}</option>)}</select></label>
              <div className="view-toggle" role="group" aria-label="Vista del catálogo">
                <button aria-label="Vista de tarjetas" aria-pressed={view === 'grid'} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={18} /></button>
                <button aria-label="Vista de tabla" aria-pressed={view === 'table'} className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={19} /></button>
              </div>
            </div>
            {(f.search || f.category !== 'Todas' || f.stock !== 'Todos') && <div className="filter-summary"><span>{f.search && `"${f.search}" · `}{f.category} · {f.stock}</span><button onClick={f.reset}>Limpiar filtros <X size={14} /></button></div>}
            {!f.filtered.length
              ? <div className="empty"><Search size={38} /><h3>No encontramos materiales</h3><p>Probá con otro nombre, código o categoría.</p><button className="primary" onClick={f.reset}>Restablecer filtros</button></div>
              : view === 'grid'
                ? <div className="product-grid">{f.filtered.map(p => <ProductCard key={p.id} p={p} onAdd={add} />)}</div>
                : <div className="table-scroll"><table><thead><tr><th>Material / SKU</th><th>Categoría</th><th>Stock</th><th>Precio unitario</th><th>Cantidad</th><th /></tr></thead><tbody>{f.filtered.map(p => <ProductCard table key={p.id} p={p} onAdd={add} />)}</tbody></table></div>}
            <footer className="catalog-footer"><span>Mostrando {f.filtered.length} de {products.length} materiales</span><a href="/creditos">Imágenes ilustrativas · Créditos</a></footer>
          </section>
          <footer className="page-footer">© 2026 Barraca Uno <span>Uno para todos.</span></footer>
        </main>
      </div>

      {/* ── Cart drawer ── */}
      {drawer && !checkout && (
        <Dialog drawer label="Mi orden de compra" onClose={() => setDrawer(false)}>
          <div className="drawer-head">
            <div><span className="eyebrow">BARRACA UNO</span><h2>Mi orden de compra</h2><p>{cart.items.length} materiales seleccionados</p></div>
            <button className="icon-button" aria-label="Cerrar orden" onClick={() => setDrawer(false)}><X /></button>
          </div>
          <div className="drawer-items">
            {!cart.items.length
              ? <div className="empty"><ShoppingCart size={44} /><h3>Tu próxima obra empieza acá</h3><p>Agregá materiales para armar tu orden.</p><button className="primary" onClick={() => setDrawer(false)}>Explorar materiales</button></div>
              : cart.items.map(i => (
                <div className="order-item" key={i.product.id}>
                  <Visual p={i.product} small />
                  <div>
                    <small>{i.product.sku}</small>
                    <h3>{i.product.name}</h3>
                    <span>{money(i.product.price)} / {i.product.unit}</span>
                    <Quantity value={i.quantity} max={i.product.stock} label={i.product.name} onChange={q => cart.update(i.product.id, q)} />
                  </div>
                  <div className="item-end">
                    <button aria-label={`Eliminar ${i.product.name}`} onClick={() => cart.remove(i.product.id)}><Trash2 size={17} /></button>
                    <strong>{money(i.quantity * i.product.price)}</strong>
                  </div>
                </div>
              ))}
          </div>
          {!!cart.items.length && (
            <div className="drawer-bottom">
              <div><span>Subtotal</span><b>{money(cart.subtotal)}</b></div>
              <div><span>IVA (22%)</span><b>{money(cart.tax)}</b></div>
              <div className="total"><span>Total de la orden</span><strong>{money(cart.total)} <small>UYU</small></strong></div>
              <button className="primary generate" onClick={() => { setDrawer(false); setCheckout(true) }}><FileText size={18} /> Completar pedido</button>
              <button className="clear-order" onClick={cart.clear}><Trash2 size={15} /> Vaciar Orden</button>
            </div>
          )}
        </Dialog>
      )}

      {/* ── Checkout ── */}
      {checkout && (
        <CheckoutModal
          cart={cart}
          account={account}
          onBack={() => { setCheckout(false); setDrawer(true) }}
          onSuccess={(id) => { setCheckout(false); setReceipt({ id, total: cart.total }); }}
        />
      )}

      {/* ── Receipt ── */}
      {receipt && (
        <Dialog label="¡Pedido enviado!" onClose={() => setReceipt(null)}>
          <div className="modal-content success">
            <CheckCircle2 size={56} />
            <h2>¡Pedido confirmado!</h2>
            <p className="receipt-id">{receipt.id}</p>
            <div className="modal-total">Total con IVA<strong>{money(receipt.total)}</strong></div>
            <p>Tu pedido fue registrado. El equipo de Barraca Uno lo va a revisar y te contactará para coordinar el pago y la entrega.</p>
            <button className="primary" onClick={() => { setReceipt(null); setMyOrders(true) }}><ClipboardList size={17} />Ver mis pedidos</button>
            <button className="clear-order" onClick={() => setReceipt(null)}>Volver al catálogo</button>
          </div>
        </Dialog>
      )}

      {/* ── My Orders ── */}
      {myOrders && <MyOrders onClose={() => setMyOrders(false)} />}

      {/* ── Profile panel ── */}
      {profilePanel && (
        <Dialog label="Personalizar mi perfil" onClose={() => setProfilePanel(false)}>
          <div className="profile-panel-head">
            <div><span className="eyebrow">BARRACA UNO / MI CUENTA</span><h2>Tu perfil. Tu estilo.</h2></div>
            <button className="icon-button" aria-label="Cerrar personalización" onClick={() => setProfilePanel(false)}><X /></button>
          </div>
          <AccountContent account={account} theme={theme} setTheme={setTheme} />
        </Dialog>
      )}

      <div className="sr-only" aria-live="polite">{toast}</div>
    </GalleryProvider>
  );
}
