"use client";

import { useEffect, useState } from 'react';
import { Save, Plus, Upload, Trash2, Image as ImageIcon, Search, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTheme, ThemeButton } from '../../profile-panel';

export default function AdminProductsPage() {
  const { theme, setTheme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (data.products) {
          // Add a dummy tax field since it's not in the DB yet, for the UI demonstration
          const withTax = data.products.map((p: any) => ({ ...p, tax: 22, changed: false }));
          setProducts(withTax);
        }
        setLoading(false);
      });
  }, []);

  const handleEdit = (id: number, field: string, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value, changed: true } : p));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    // Simulate save delay
    await new Promise(r => setTimeout(r, 1000));
    setProducts(prev => prev.map(p => ({ ...p, changed: false })));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  const hasChanges = products.some(p => p.changed);

  return (
    <div className="admin-page" style={{ paddingBottom: 100 }}>
      <header className="account-page-header">
        <a className="account-logo" href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </a>
        <ThemeButton theme={theme} setTheme={setTheme} />
      </header>

      <main className="admin-main" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--action)', fontWeight: 700, letterSpacing: 1, fontSize: 11, marginBottom: 8 }}>CATÁLOGO MAESTRO</div>
            <h1 style={{ fontSize: 32, margin: 0, color: 'var(--ink)' }}>Gestión de Productos</h1>
            <p style={{ color: 'var(--soft)', marginTop: 8 }}>Edita precios, imágenes e impuestos de forma masiva.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 6, color: 'var(--ink)', fontWeight: 500 }}>
              <Plus size={16} /> Nuevo Producto
            </button>
            <button 
              onClick={handleSaveAll} 
              disabled={!hasChanges || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: hasChanges ? 'var(--action)' : 'var(--edge)', color: hasChanges ? '#fff' : 'var(--soft)', border: 'none', borderRadius: 6, fontWeight: 500, transition: 'all 0.2s', cursor: hasChanges ? 'pointer' : 'not-allowed' }}
            >
              {saving ? <RefreshCw size={16} className="spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--edge)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--raised)' }}>
            <div className="global-search" style={{ margin: 0, flex: 1, maxWidth: 400, height: 38, background: 'var(--field)', border: '1px solid var(--edge)', display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 6 }}>
              <Search size={16} color="var(--soft)" />
              <input 
                placeholder="Buscar por nombre o SKU..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', marginLeft: 8, color: 'var(--ink)', fontSize: 13 }} 
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--soft)' }}>{filtered.length} productos</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--raised)', borderBottom: '1px solid var(--edge)', color: 'var(--soft)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, width: 60 }}>Img</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, width: '30%' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Categoría</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Precio (UYU)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>IVA (%)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando catálogo...</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--edge)', background: p.changed ? 'var(--raised)' : 'transparent' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--edge)', display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: 'pointer' }} title="Cambiar imagen">
                        {p.imageSrc ? <img src={`/images/products/${p.imageSrc}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} /> : <ImageIcon size={18} color="var(--soft)" />}
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        value={p.sku} 
                        onChange={e => handleEdit(p.id, 'sku', e.target.value)} 
                        style={{ width: 80, padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }} 
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        value={p.name} 
                        onChange={e => handleEdit(p.id, 'name', e.target.value)} 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)', fontWeight: 500 }} 
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <select 
                        value={p.category} 
                        onChange={e => handleEdit(p.id, 'category', e.target.value)}
                        style={{ padding: '6px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }}
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      >
                        <option value="Masonería">Masonería</option>
                        <option value="Hierros y Estructuras">Hierros y Estructuras</option>
                        <option value="Herramientas">Herramientas</option>
                        <option value="Sanitaria">Sanitaria</option>
                        <option value="Electricidad">Electricidad</option>
                        <option value="Pinturería">Pinturería</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--soft)', marginRight: 4 }}>$</span>
                        <input 
                          type="number" 
                          value={p.price} 
                          onChange={e => handleEdit(p.id, 'price', Number(e.target.value))} 
                          style={{ width: 80, padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }} 
                          onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                          onBlur={e => e.target.style.border = '1px solid transparent'}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <select 
                        value={p.tax} 
                        onChange={e => handleEdit(p.id, 'tax', Number(e.target.value))}
                        style={{ padding: '6px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }}
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      >
                        <option value={22}>22% (Básico)</option>
                        <option value={10}>10% (Mínimo)</option>
                        <option value={0}>0% (Exento)</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <button style={{ padding: 6, color: 'var(--soft)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Eliminar producto">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
