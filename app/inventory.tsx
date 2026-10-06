"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Dialog } from './modal';
import { BrandLogo, CityScape } from './brand-art';
import { GalleryProvider, useProductGallery } from './product-gallery';
import { useAccount, useTheme, ThemeButton, Avatar, AccountContent } from './profile-panel';
import { Package, Search, X, ShoppingCart, Bell, ChevronDown, Grid2X2, List, Plus, Minus, Trash2, Check, Building2, ArrowUpRight, Boxes, TriangleAlert, Paintbrush, Wrench, Zap, Droplets, Layers, FileText, CheckCircle2, Clock, Truck, XCircle, MapPin, CreditCard, Phone, StickyNote, ClipboardList, RefreshCw, Users, ShieldCheck, Award, Sparkles, Copy, Download, QrCode, Star, ArrowRight } from 'lucide-react';
import { Category, Product, OrderItem, names, categories, defaultProducts, APP_VERSION } from '../lib/catalog';
import { generateAndDownloadPdf, InvoiceData } from '../lib/invoice-receipt';
import { generateQrSvg } from '../lib/qr';

const money = (v: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(v);
const fmtDate = (v: string) => new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(new Date(v));
const icons: Record<string, typeof Package> = { 'Masonería': Layers, 'Hierros y Estructuras': Boxes, 'Herramientas': Wrench, 'Sanitaria': Droplets, 'Electricidad': Zap, 'Pinturería': Paintbrush };

export interface ReceiptData {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  method: string;
  invoiceType: 'consumidor_final' | 'factura_rut';
  rut?: string;
  companyName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  items: Array<{ name: string; sku?: string; quantity: number; unit?: string; unitPrice: number; total: number }>;
  dateStr: string;
}

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

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

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
  return <button type="button" aria-label={`Ver fotos de ${p.name}`} onClick={() => open(p)} className={`product-visual photo ${small ? 'small' : ''}`}><img src={p.imageSrc || `/products/${p.imageId}.jpg`} alt={`Imagen ilustrativa de ${p.name}`} loading="lazy" />{!small && <span className="photo-brand">{p.brand}</span>}<span className="photo-expand">Ver fotos ↗</span></button>;
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
function MyOrders({ onClose, account }: { onClose: () => void; account: ReturnType<typeof useAccount> }) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadInvoice = async (o: UserOrder) => {
    setDownloadingId(o.id);
    try {
      const res = await fetch(`/api/orders?orderId=${encodeURIComponent(o.id)}`);
      let itemsList: InvoiceData['items'] = [];
      let rutVal: string | undefined;
      let companyVal: string | undefined;

      if (res.ok) {
        const data = await res.json() as { order?: { notes?: string; user_name?: string; user_email?: string; shipping_address?: string; shipping_city?: string; shipping_phone?: string; subtotal?: number; tax?: number; total?: number; payment_method?: string; created_at?: string }; items?: Array<{ product_name: string; product_sku: string; product_unit: string; quantity: number; unit_price: number; line_total: number }> };
        if (data.items?.length) {
          itemsList = data.items.map(it => ({
            name: it.product_name,
            sku: it.product_sku,
            quantity: it.quantity,
            unit: it.product_unit,
            unitPrice: it.unit_price,
            total: it.line_total,
          }));
        }
        if (data.order?.notes) {
          const rutMatch = data.order.notes.match(/RUT\s+([0-9]{12})/i);
          if (rutMatch) rutVal = rutMatch[1];
          const compMatch = data.order.notes.match(/RUT\s+[0-9]{12}\s*-\s*([^\]]+)/i);
          if (compMatch) companyVal = compMatch[1].trim();
        }
      }

      if (!itemsList.length && o.items_summary) {
        itemsList = o.items_summary.split('|').map(s => {
          const parts = s.split(' x');
          const qty = parseInt(parts[1] || '1', 10);
          return {
            name: parts[0] || 'Material de construcción',
            quantity: qty,
            unitPrice: Math.round(o.total / (qty || 1)),
            total: o.total,
          };
        });
      }

      const subtotal = Math.round(o.total / 1.22);
      const tax = o.total - subtotal;

      await generateAndDownloadPdf({
        orderId: o.id,
        dateStr: fmtDate(o.created_at),
        customerName: account.profile?.displayName || 'Cliente',
        customerEmail: account.profile?.email || '',
        customerPhone: '',
        companyName: companyVal || account.profile?.company,
        rut: rutVal || (account.profile?.bio?.match(/RUT:\s*([0-9]+)/i)?.[1] || undefined),
        address: o.shipping_address || 'Entrega coordinada',
        city: o.shipping_city || 'Uruguay',
        paymentMethod: o.payment_method,
        items: itemsList.length ? itemsList : [{ name: 'Materiales Barraca Uno', quantity: 1, unitPrice: subtotal, total: subtotal }],
        subtotal,
        tax,
        total: o.total,
      });
    } catch (e) {
      alert('No se pudo generar el comprobante. Reintentá.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog label="Mis pedidos" onClose={onClose}>
      <div className="my-orders-panel">
        <div className="drawer-head">
          <div><span className="eyebrow">BARRACA UNO</span><h2>Mis pedidos</h2><p>Historial y comprobantes oficiales de tus compras</p></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary icon-only" aria-label="Actualizar" onClick={() => void load()}><RefreshCw size={16} /></button>
            <button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button>
          </div>
        </div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading && <p className="orders-loading"><Clock size={20} /> Cargando pedidos…</p>}
        {!loading && !orders.length && (
          <div className="empty"><ClipboardList size={44} /><h3>Todavía no tenés pedidos</h3><p>Cuando hagas una orden va a aparecer acá con su comprobante fiscal y estado en tiempo real.</p></div>
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
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={downloadingId === o.id}
                  onClick={() => handleDownloadInvoice(o)}
                >
                  <Download size={14} />
                  {downloadingId === o.id ? 'Generando PDF…' : 'Descargar Comprobante Fiscal (PDF)'}
                </button>
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
  onSuccess: (receipt: ReceiptData) => void;
  onBack: () => void;
}) {
  const defaultRut = (account.profile?.bio?.match(/RUT:\s*([0-9]+)/i)?.[1] || '').trim();
  const defaultCompany = (account.profile?.company || '').trim();
  const [invoiceType, setInvoiceType] = useState<'consumidor_final' | 'factura_rut'>(defaultRut ? 'factura_rut' : 'consumidor_final');
  const [rut, setRut] = useState(defaultRut);
  const [companyName, setCompanyName] = useState(defaultCompany);

  const [form, setForm] = useState<CheckoutForm>({
    paymentMethod: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPhone: account.profile?.phone || '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!account.authenticated) { setError('Necesitás iniciar sesión para hacer un pedido.'); return; }
    if (invoiceType === 'factura_rut') {
      const cleanRut = rut.trim();
      if (!cleanRut || cleanRut.length !== 12 || !/^\d+$/.test(cleanRut)) {
        setError('El RUT para e-Factura DGI debe tener exactamente 12 dígitos numéricos.');
        return;
      }
      if (!companyName.trim()) {
        setError('Ingresá la Razón Social o nombre de la Empresa / Obra.');
        return;
      }
    }

    setSubmitting(true); setError('');
    try {
      const payload = {
        items: cart.items.map(i => ({ productId: i.product.id, productName: i.product.name, productSku: i.product.sku, productUnit: i.product.unit, quantity: i.quantity, unitPrice: i.product.price })),
        invoiceType,
        rut: invoiceType === 'factura_rut' ? rut.trim() : undefined,
        companyName: invoiceType === 'factura_rut' ? companyName.trim() : undefined,
        ...form,
      };
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json() as { orderId?: string; error?: string };
      if (!r.ok) throw Error(d.error || 'No pudimos procesar tu pedido.');
      const total = cart.total;
      const receiptItems = cart.items.map(i => ({
        name: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unit: i.product.unit,
        unitPrice: i.product.price,
        total: i.quantity * i.product.price,
      }));
      cart.clear();
      onSuccess({
        id: d.orderId!,
        total,
        subtotal: cart.subtotal,
        tax: cart.tax,
        method: form.paymentMethod,
        invoiceType,
        rut: invoiceType === 'factura_rut' ? rut.trim() : undefined,
        companyName: invoiceType === 'factura_rut' ? companyName.trim() : undefined,
        customerName: account.profile?.displayName || 'Cliente',
        customerEmail: account.profile?.email || '',
        customerPhone: form.shippingPhone,
        address: form.shippingAddress,
        city: form.shippingCity,
        items: receiptItems,
        dateStr: new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'medium' }),
      });
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

          {/* Facturación Fiscal DGI */}
          <section className="checkout-section">
            <h3><Building2 size={16} />Tipo de comprobante fiscal DGI</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setInvoiceType('consumidor_final')}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: `2px solid ${invoiceType === 'consumidor_final' ? 'var(--accent)' : 'var(--border)'}`,
                  background: invoiceType === 'consumidor_final' ? 'rgba(59,130,246,0.12)' : 'var(--surface-muted)',
                  color: invoiceType === 'consumidor_final' ? 'var(--accent)' : 'inherit',
                  fontWeight: invoiceType === 'consumidor_final' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Consumidor Final (e-Ticket)
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('factura_rut')}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: `2px solid ${invoiceType === 'factura_rut' ? 'var(--accent)' : 'var(--border)'}`,
                  background: invoiceType === 'factura_rut' ? 'rgba(59,130,246,0.12)' : 'var(--surface-muted)',
                  color: invoiceType === 'factura_rut' ? 'var(--accent)' : 'inherit',
                  fontWeight: invoiceType === 'factura_rut' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Empresa / Obra (e-Factura RUT)
              </button>
            </div>

            {invoiceType === 'factura_rut' && (
              <div className="checkout-fields" style={{ background: 'rgba(59,130,246,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <label>
                  <span>RUT de la Empresa (12 dígitos numéricos DGI)</span>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="Ej: 214589210019"
                    value={rut}
                    onChange={e => setRut(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </label>
                <label>
                  <span>Razón Social / Nombre de Obra</span>
                  <input
                    type="text"
                    placeholder="Ej: Constructora Horizonte S.A."
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                  />
                </label>
              </div>
            )}
          </section>

          {/* Envío */}
          <section className="checkout-section">
            <h3><MapPin size={16} />Datos de entrega</h3>
            <div className="checkout-fields">
              <label><span>Dirección o Calle y Número</span><input type="text" placeholder="Ej: Av. 18 de Julio 1234 esq. Cuareim" value={form.shippingAddress} onChange={set('shippingAddress')} required /></label>
              <label><span>Ciudad / Departamento</span><input type="text" placeholder="Ej: Montevideo" value={form.shippingCity} onChange={set('shippingCity')} required /></label>
              <label><span>Teléfono de contacto / Obra</span><input type="tel" placeholder="Ej: 099 123 456" value={form.shippingPhone} onChange={set('shippingPhone')} required /></label>
            </div>
          </section>

          {/* Pago */}
          <section className="checkout-section">
            <h3><CreditCard size={16} />Método de pago</h3>
            <div className="payment-options">
              {['Efectivo / Redpagos / Abitab', 'Transferencia bancaria BROU / Santander / Itaú', 'Cheque al día', 'Tarjeta de débito', 'Tarjeta de crédito'].map(m => (
                <label key={m} className={`payment-option ${form.paymentMethod === m ? 'selected' : ''}`}>
                  <input type="radio" name="payment" value={m} checked={form.paymentMethod === m} onChange={set('paymentMethod')} />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Notas */}
          <section className="checkout-section">
            <h3><StickyNote size={16} />Instrucciones para despacho <small>(opcional)</small></h3>
            <textarea placeholder="Horarios de recepción de materiales, persona autorizada a recibir, etc." value={form.notes} onChange={set('notes')} rows={2} />
          </section>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <div className="checkout-actions">
          <button className="secondary" onClick={onBack} disabled={submitting}>← Volver a la orden</button>
          <button className="primary generate" onClick={() => void submit()} disabled={submitting || !account.authenticated || !form.paymentMethod || !form.shippingAddress || !form.shippingCity || !form.shippingPhone}>
            {submitting ? 'Enviando orden…' : <><CheckCircle2 size={18} /> Confirmar y Emitir Comprobante</>}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export interface UserOrder { id: string; status: string; payment_method: string; shipping_address: string; shipping_city: string; total: number; created_at: string; items_summary: string; }

export default function Home({ initialProducts = defaultProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState(initialProducts), [stockError, setStockError] = useState(''), [stockRefreshing, setStockRefreshing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
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

  useEffect(() => {
    if (!account.authenticated || account.isAdmin) return;
    fetch('/api/orders', { cache: 'no-store' }).then(r => r.json() as Promise<{ orders?: UserOrder[] }>).then(d => {
      if (d.orders) setUserOrders(d.orders);
    }).catch(console.error);
  }, [account.authenticated, account.isAdmin]);


  const { theme, setTheme } = useTheme();
  const [profilePanel, setProfilePanel] = useState(false);
  const [view, setView] = useState('grid');
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [myOrders, setMyOrders] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [profile, setProfile] = useState(false);
  const [toast, setToast] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Buyer loyalty tier
  const totalSpent = useMemo(() => {
    return userOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [userOrders]);

  const buyerTier = useMemo(() => {
    if (totalSpent >= 15000) {
      return {
        id: 'vip',
        name: 'Cliente VIP Empresarial',
        badge: '🌟 VIP Empresarial',
        color: '#f59e0b',
        level: 3,
        motivation: '🌟 ¡Nivel VIP Empresarial alcanzado! Estamos muy contentos y agradecidos con vos por confiar en nosotros para tus obras. Contás con despacho exprés prioritario, lista preferencial y asesor técnico asignado.',
        progress: 100,
        nextTierText: '¡Máximo nivel de beneficios alcanzado!',
      };
    } else if (totalSpent >= 5000) {
      return {
        id: 'frecuente',
        name: 'Cliente Frecuente',
        badge: '🥈 Frecuente',
        color: '#3b82f6',
        level: 2,
        motivation: '🎉 ¡Felicitaciones! Sos Cliente Frecuente. Gracias por confiar en Barraca Uno para tus proyectos. Estás a un paso de ascender a Cliente VIP con atención personalizada.',
        progress: Math.min(100, Math.round(((totalSpent - 5000) / 10000) * 100)),
        nextTierText: `Te faltan ${money(15000 - totalSpent)} para nivel VIP`,
      };
    } else {
      return {
        id: 'constructor',
        name: 'Cliente Constructor',
        badge: '🧱 Constructor Inicial',
        color: '#10b981',
        level: 1,
        motivation: '👋 ¡Bienvenido al programa de beneficios de Barraca Uno! Acumulá pedidos para ascender a Cliente Frecuente y obtener bonificaciones exclusivas en flete y herramientas.',
        progress: Math.min(100, Math.round((totalSpent / 5000) * 100)),
        nextTierText: `Te faltan ${money(5000 - totalSpent)} para Cliente Frecuente`,
      };
    }
  }, [totalSpent]);

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
          <div style={{ position: 'relative' }}>
            {account.isAdmin ? (
              <>
                <button className="alert-button" aria-label="Ver alertas de stock" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={21} /><span className="alert-dot">{products.filter(p => p.stock > 0 && p.stock <= 10).length}</span></button>
                {notificationsOpen && (
                  <div className="profile-menu" style={{ right: 0, width: '320px', zIndex: 100 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--blue)' }}>Alertas de Stock</h4>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {products.filter(p => p.stock > 0 && p.stock <= 10).map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span className="status low" style={{ marginLeft: '10px' }}>Quedan {p.stock}</span>
                        </div>
                      ))}
                      {products.filter(p => p.stock > 0 && p.stock <= 10).length === 0 && <p style={{ fontSize: '12px', color: 'var(--muted)' }}>No hay alertas de stock bajo.</p>}
                    </div>
                    <button className="secondary" style={{ width: '100%', marginTop: '10px', fontSize: '12px', padding: '8px' }} onClick={() => { f.setStock('Stock Crítico'); f.setCategory('Todas'); setNotificationsOpen(false); }}>Ver todos en catálogo</button>
                  </div>
                )}
              </>
            ) : account.authenticated ? (
              <>
                <button className="alert-button" aria-label="Ver notificaciones y nivel" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={21} /><span className="alert-dot" style={{ background: buyerTier.color }}>{userOrders.length > 0 ? userOrders.length : 1}</span></button>
                {notificationsOpen && (
                  <div className="profile-menu" style={{ right: 0, width: '340px', zIndex: 100, padding: '14px' }}>
                    {/* Buyer Tier VIP Card */}
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', fontWeight: 700 }}>Nivel de Comprador</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: buyerTier.color, color: '#fff' }}>{buyerTier.badge}</span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', lineHeight: '1.4', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {buyerTier.motivation}
                      </p>
                      <div style={{ background: 'rgba(0,0,0,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ background: buyerTier.color, width: `${buyerTier.progress}%`, height: '100%', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-soft)' }}>
                        <span>Invertido: {money(totalSpent)}</span>
                        <span>{buyerTier.nextTierText}</span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList size={14} /> Estado de tus Pedidos</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {userOrders.slice(0, 5).map(o => (
                        <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600 }}>Pedido {o.id}</span>
                            <StatusBadge status={o.status} />
                          </div>
                          <span style={{ color: 'var(--text-soft)', fontSize: '11px' }}>
                            {o.status === 'pending' ? 'Tu pedido fue recibido y está esperando pago.' : o.status === 'approved' ? 'El pago fue aprobado y está en preparación.' : o.status === 'shipped' ? '¡Tu pedido ya está en camino a la obra!' : o.status === 'delivered' ? 'El pedido fue entregado. ¡Gracias por elegirnos!' : 'El pedido fue cancelado.'}
                          </span>
                        </div>
                      ))}
                      {userOrders.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-soft)' }}>No tenés pedidos registrados aún.</p>}
                    </div>
                    <button className="secondary" style={{ width: '100%', marginTop: '10px', fontSize: '12px', padding: '8px' }} onClick={() => { setNotificationsOpen(false); setMyOrders(true); }}>Ver mis pedidos y comprobantes</button>
                  </div>
                )}
              </>
            ) : null}
          </div>
          <button className="theme-button" aria-label="Actualizar stock" title="Actualizar stock" onClick={() => void manualRefresh()} disabled={stockRefreshing} style={{ color: stockRefreshing ? 'var(--accent-line)' : undefined }}><RefreshCw size={19} style={{ animation: stockRefreshing ? 'spin 0.8s linear infinite' : undefined }} /></button>
          {account.authenticated && !account.isAdmin && (
            <button className="orders-trigger" onClick={() => setMyOrders(true)} title="Mis pedidos"><ClipboardList size={20} /><span>Mis pedidos</span></button>
          )}
          <button className="cart-trigger" onClick={() => setDrawer(true)}><span className="cart-icon"><ShoppingCart size={21} />{cart.count > 0 && <b>{cart.count}</b>}</span><span>Mi orden<small>{money(cart.total)}</small></span></button>
          <ThemeButton theme={theme} setTheme={setTheme} />
          <div className="profile-wrap">
            <button className="profile" aria-label="Menú de usuario" aria-expanded={profile} onClick={() => setProfile(!profile)}><Avatar profile={account.profile} /><ChevronDown size={14} /></button>
            {profile && <div className="profile-menu">
              <strong>{account.loading ? 'Cargando cuenta…' : account.profile?.displayName || 'Tu cuenta'}</strong>
              <small>{account.profile?.email || 'Entrá y personalizá tu espacio'}</small>
              {account.profile?.company && <small style={{ color: 'var(--accent)', fontWeight: 600 }}>{account.profile.company}</small>}
              <hr />
              <button onClick={() => { setProfile(false); setProfilePanel(true) }}>{account.authenticated ? 'Personalizar mi perfil' : 'Iniciar sesión'}</button>
              <Link href="/cuenta">Mi perfil y cuenta</Link>
              {account.authenticated && !account.isAdmin && <button onClick={() => { setProfile(false); setMyOrders(true) }}><ClipboardList size={15} />Mis pedidos y comprobantes</button>}
              <Link href="/locales">Nuestros locales</Link>
              <Link href="/guia">Cómo usar Barraca Uno</Link>
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

          {/* HERRAMIENTAS DE ADMINISTRACIÓN EN EL PANEL LATERAL */}
          {account.isAdmin && (
            <div className="sidebar-admin-box" style={{ margin: '14px 0 10px', padding: '10px 8px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div className="side-label" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} /> PANEL ADMINISTRATIVO
              </div>
              <Link href="/stock" className="cat-link stock-nav" style={{ fontWeight: 600, fontSize: '13px', margin: '3px 0' }}><Boxes size={16} />Control de stock <Plus size={14} /></Link>
              <Link href="/pedidos-admin" className="cat-link" style={{ fontWeight: 600, fontSize: '13px', margin: '3px 0' }}><ClipboardList size={16} />Gestión de pedidos</Link>
              <Link href="/clientes" className="cat-link" style={{ fontWeight: 600, fontSize: '13px', margin: '3px 0' }}><Users size={16} />Gestión de clientes (CRM)</Link>
              <Link href="/administracion" className="cat-link" style={{ fontWeight: 600, fontSize: '13px', margin: '3px 0' }}><ShieldCheck size={16} />Seguridad y cuentas</Link>
            </div>
          )}

          <Link href="/locales" className="cat-link"><Building2 size={17} />Nuestros locales</Link>
          <div className="side-label category-label">CATEGORÍAS</div>
          <button className={`cat-link ${f.category === 'Todas' ? 'selected' : ''}`} onClick={() => f.setCategory('Todas')}><Grid2X2 size={17} />Todos los materiales<span>{products.length}</span></button>
          {categories.map(c => { const Icon = icons[c.name]; return <button key={c.id} className={`cat-link ${f.category === c.name ? 'selected' : ''}`} onClick={() => f.setCategory(c.name)}><Icon size={17} />{c.name}<span>{products.filter(p => p.category === c.name).length}</span></button> })}
          <div className="sidebar-note"><CityScape /><span className="note-icon"><Building2 size={20} /></span><strong>Uno para todos.</strong><span>De la barraca a tu obra.</span><div><span className="live-dot" /> Stock sincronizado</div></div>
          <div className="sidebar-footer">BARRACA UNO <span>{APP_VERSION}</span></div>
        </aside>

        <main>
          <div className="breadcrumb">Espacio de trabajo <span>/</span> <b>Inventario</b></div>
          <div className="page-heading"><CityScape className="heading-city" /><div><div className="eyebrow">CATÁLOGO DE MATERIALES</div><h1>Nuestros Productos</h1><p>Todo lo que necesitás para tu obra, con stock en tiempo real.</p></div><button className="primary order-button" onClick={() => setDrawer(true)}><ShoppingCart size={18} /> Ver carrito {cart.count > 0 && <b>{cart.count}</b>}</button></div>

          {stockError && <p className="admin-error" role="alert">{stockError} Actualizá la página para reintentar.</p>}

          <section className="stats" aria-label="Resumen de inventario">
            <div><span className="stat-icon blue"><Boxes size={22} /></span><div><small>Materiales en catálogo</small><strong>{products.length}<span>productos</span></strong></div></div>
            <div><span className="stat-icon green"><CheckCircle2 size={22} /></span><div><small>Stock disponible</small><strong>{products.filter(p => p.stock > 10).length}<span>en stock</span></strong></div></div>
            <button onClick={() => { f.setStock('Stock Crítico'); f.setCategory('Todas') }}><span className="stat-icon amber"><TriangleAlert size={22} /></span><div><small>Para reponer</small><strong>{products.filter(p => p.stock > 0 && p.stock <= 10).length}<span>con stock bajo</span></strong></div><ArrowUpRight size={17} /></button>
            <div><span className="stat-icon rose"><Package size={22} /></span><div><small>Sin disponibilidad</small><strong>{products.filter(p => p.stock === 0).length}<span>agotados</span></strong></div></div>
          </section>

          <section className="catalog">
            <div className="catalog-heading"><div><h2>Materiales disponibles</h2><span>{f.filtered.length} artículos encontrados</span></div><div className="price-info">Precios en UYU <span>·</span> IVA no incluido</div></div>
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
            <footer className="catalog-footer"><span>Mostrando {f.filtered.length} de {products.length} materiales</span><Link href="/creditos">Imágenes ilustrativas · Créditos</Link></footer>
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

              {/* B2B SaaS features: Download Quote & Share Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={async () => {
                    setIsGeneratingPdf(true);
                    try {
                      await generateAndDownloadPdf({
                        orderId: `COT-${Date.now().toString(36).toUpperCase()}`,
                        customerName: account.profile?.displayName || 'Cliente Obra',
                        customerEmail: account.profile?.email || 'ventas@barraca-uno.com',
                        customerPhone: account.profile?.phone,
                        companyName: account.profile?.company,
                        rut: account.profile?.bio?.match(/RUT:\s*([0-9]+)/i)?.[1],
                        address: 'Entrega en Obra a coordinar',
                        city: 'Montevideo / Canelones',
                        paymentMethod: 'Presupuesto B2B válido por 15 días',
                        items: cart.items.map(i => ({
                          name: i.product.name,
                          sku: i.product.sku,
                          quantity: i.quantity,
                          unit: i.product.unit,
                          unitPrice: i.product.price,
                          total: i.quantity * i.product.price,
                        })),
                        subtotal: cart.subtotal,
                        tax: cart.tax,
                        total: cart.total,
                        notes: 'Cotización comercial para acopio de materiales y compras de obra. Precios congelados por 15 días corridos.',
                        dateStr: new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'medium' }),
                      }, `Cotizacion_BarracaUno_${Date.now().toString(36).toUpperCase()}.pdf`);
                    } catch {
                      alert('Error al generar la cotización.');
                    } finally {
                      setIsGeneratingPdf(false);
                    }
                  }}
                  disabled={isGeneratingPdf}
                >
                  <Download size={14} /> {isGeneratingPdf ? 'Generando…' : 'Cotización (PDF)'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={async () => {
                    const text = `📋 *Cotización / Pedido Barraca Uno*\n` +
                      cart.items.map(i => `• ${i.quantity} ${i.product.unit} × ${i.product.name} (${money(i.product.price)}) = ${money(i.quantity * i.product.price)}`).join('\n') +
                      `\n\n*Subtotal:* ${money(cart.subtotal)}\n*IVA (22%):* ${money(cart.tax)}\n*Total:* ${money(cart.total)} UYU\n\nEmitido por Barraca Uno SaaS v2.3`;
                    try {
                      await navigator.clipboard.writeText(text);
                      setToast('¡Resumen de orden copiado al portapapeles!');
                    } catch {
                      alert('No se pudo copiar automáticamente.');
                    }
                  }}
                >
                  <Copy size={14} /> Compartir
                </button>
              </div>

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
          onSuccess={(newReceipt) => { setCheckout(false); setReceipt(newReceipt); }}
        />
      )}

      {/* ── Receipt ── */}
      {receipt && (
        <Dialog label="¡Pedido enviado!" onClose={() => setReceipt(null)}>
          <div className="modal-content success" style={{ paddingBottom: '30px', maxWidth: '580px', margin: '0 auto' }}>
            <CheckCircle2 size={52} color="#10b981" />
            <h2 style={{ margin: '8px 0 4px' }}>¡Pedido confirmado con éxito!</h2>
            <p className="receipt-id" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>{receipt.id}</p>

            {/* DGI QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', padding: '12px', background: '#ffffff', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div dangerouslySetInnerHTML={{
                __html: generateQrSvg(`RUT:218492010019|CFE:${receipt.invoiceType === 'factura_rut' ? '111' : '101'}|SERIE:A-00|NUM:${receipt.id}|TOTAL:${receipt.total}|FECHA:${receipt.dateStr}|HASH:${receipt.id.slice(-6).toUpperCase()}`, 125)
              }} />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                {receipt.invoiceType === 'factura_rut' ? 'e-Factura CFE 111 con RUT' : 'e-Ticket CFE 101 Consumidor Final'} · Verificación DGI
              </span>
            </div>

            {/* Order & Fiscal Meta */}
            <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-soft)' }}>Fecha y hora:</span>
                <strong>{receipt.dateStr}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-soft)' }}>Facturación:</span>
                <strong>{receipt.companyName ? `${receipt.companyName} (RUT: ${receipt.rut})` : (receipt.customerName || 'Consumidor Final')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-soft)' }}>Forma de pago:</span>
                <strong>{receipt.method}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-soft)' }}>Entrega:</span>
                <span>{receipt.address}, {receipt.city}</span>
              </div>
            </div>

            {/* Items summary */}
            <div style={{ maxHeight: '140px', overflowY: 'auto', textAlign: 'left', marginBottom: '14px', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
              {receipt.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: idx < receipt.items.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                  <span>{it.quantity} {it.unit || 'un.'} × {it.name}</span>
                  <strong>{money(it.total)}</strong>
                </div>
              ))}
            </div>

            <div className="modal-total" style={{ margin: '0 0 16px' }}>Total abonado con IVA<strong>{money(receipt.total)}</strong></div>

            <button
              className="primary"
              style={{ width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={isGeneratingPdf}
              onClick={async () => {
                setIsGeneratingPdf(true);
                try {
                  await generateAndDownloadPdf({
                    orderId: receipt.id,
                    dateStr: receipt.dateStr,
                    customerName: receipt.customerName || 'Cliente',
                    customerEmail: receipt.customerEmail || '',
                    customerPhone: receipt.customerPhone,
                    companyName: receipt.companyName,
                    rut: receipt.rut,
                    address: receipt.address || 'Entrega coordinada',
                    city: receipt.city || 'Uruguay',
                    paymentMethod: receipt.method,
                    items: receipt.items,
                    subtotal: receipt.subtotal,
                    tax: receipt.tax,
                    total: receipt.total,
                  });
                } catch (e) {
                  alert('Error al generar el comprobante PDF.');
                } finally {
                  setIsGeneratingPdf(false);
                }
              }}
            >
              <Download size={16} />
              {isGeneratingPdf ? 'Generando PDF oficial…' : 'Descargar Comprobante Fiscal Oficial (PDF)'}
            </button>

            <button className="secondary" style={{ width: '100%', marginBottom: '10px' }} onClick={() => { setReceipt(null); setMyOrders(true) }}><ClipboardList size={17} />Ver todos mis pedidos</button>
            <button className="clear-order" onClick={() => setReceipt(null)}>Volver al catálogo</button>
          </div>
        </Dialog>
      )}

      {/* ── My Orders ── */}
      {myOrders && <MyOrders onClose={() => setMyOrders(false)} account={account} />}

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
