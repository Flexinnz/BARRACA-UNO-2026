"use client";

import { useEffect, useState } from 'react';
import { Save, Plus, Upload, Trash2, Image as ImageIcon, Search, ArrowLeft, RefreshCw, CheckCircle2, X, Pencil } from 'lucide-react';
import { Dialog } from './modal';

export interface MercaderiaProductApiItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  tax?: number;
  unit?: string;
  imageId?: number | string;
  imageSrc?: string;
  description?: string;
  stock?: number;
}

export interface MercaderiaApiResponse {
  products?: MercaderiaProductApiItem[];
  error?: string;
}

export function MercaderiaSection() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [currentProduct, setCurrentProduct] = useState({
    id: -1, sku: '', name: '', category: 'Masonería', price: '', tax: 22, newCategory: '', imageSrc: '', description: '', images: [] as string[]
  });

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json() as Promise<MercaderiaApiResponse>)
      .then((data) => {
        if (data.products) {
          const withData = data.products.map((p: any) => {
            let images: string[] = [];
            if (p.imageSrc && p.imageSrc.startsWith('[')) {
              try { images = JSON.parse(p.imageSrc); } catch(e) {}
            } else {
              const mainPhoto = p.imageSrc || `/products/${p.imageId || 1}.jpg`;
              const extraPhotos = p.imageId && p.imageId <= 12 ? [`/products/${p.imageId}-2.jpg`, ...(p.imageId === 5 ? [] : [`/products/${p.imageId}-3.jpg`])] : [];
              images = [mainPhoto, ...extraPhotos.filter((ep: string) => ep !== mainPhoto)];
            }
            return { ...p, tax: p.tax || 22, changed: false, description: p.description || '', images };
          });
          setProducts(withData);
        }
        setLoading(false);
      });
  }, []);

  const handleQuickEdit = (id: number, field: string, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value, changed: true } : p));
  };

  const handleAddProduct = () => {
    setCurrentProduct({
      id: -Math.floor(Math.random() * 1000000),
      sku: '', name: '', category: 'Masonería', price: '', tax: 22, newCategory: '', imageSrc: '', description: '', images: []
    });
    setModalMode('add');
  };

  const openEditModal = (p: any) => {
    setCurrentProduct({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: p.price,
      tax: p.tax,
      newCategory: '',
      imageSrc: p.imageSrc || '',
      description: p.description || '',
      images: p.images || []
    });
    setModalMode('edit');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCurrentProduct(prev => ({...prev, images: [...prev.images, ev.target!.result as string]}));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setCurrentProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const submitModal = (addAnother: boolean = false) => {
    if (!currentProduct.name || !currentProduct.sku || !currentProduct.price) {
      alert("Por favor completa los campos requeridos (SKU, Nombre, Precio).");
      return;
    }
    
    const finalImageSrc = currentProduct.images.length > 0 ? JSON.stringify(currentProduct.images) : '';
    
    const productToSave = {
      id: currentProduct.id,
      sku: currentProduct.sku,
      name: currentProduct.name,
      category: currentProduct.newCategory || currentProduct.category,
      price: Number(currentProduct.price),
      tax: currentProduct.tax,
      description: currentProduct.description,
      stock: 0,
      changed: true,
      imageSrc: finalImageSrc,
      images: currentProduct.images
    };
    
    if (modalMode === 'add') {
      setProducts(prev => [productToSave, ...prev]);
    } else {
      setProducts(prev => prev.map(p => p.id === productToSave.id ? { ...p, ...productToSave } : p));
    }
    
    if (addAnother && modalMode === 'add') {
      setCurrentProduct({
        id: -Math.floor(Math.random() * 1000000),
        sku: '', name: '', category: 'Masonería', price: '', tax: 22, newCategory: '', imageSrc: '', description: '', images: []
      });
    } else {
      setModalMode(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto del catálogo?')) {
      if (id < 0) {
        setProducts(prev => prev.filter(p => p.id !== id));
        return;
      }
      try {
        const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        setProducts(prev => prev.filter(p => p.id !== id));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e) {
        alert('Error al eliminar producto');
        console.error(e);
      }
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const changedProducts = products.filter(p => p.changed || p.id < 0);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: changedProducts.map(p => ({
          ...p,
          imageSrc: p.images?.length ? JSON.stringify(p.images) : p.imageSrc
        })) })
      });
      if (!res.ok) throw new Error('Failed to save');
      
      const freshRes = await fetch('/api/products');
      const freshData = (await freshRes.json()) as MercaderiaApiResponse;
      if (freshData.products) {
        const withData = freshData.products.map((p: any) => {
          let images: string[] = [];
          if (p.imageSrc && p.imageSrc.startsWith('[')) {
            try { images = JSON.parse(p.imageSrc); } catch(e) {}
          } else {
            const mainPhoto = p.imageSrc || `/products/${p.imageId || 1}.jpg`;
            const extraPhotos = p.imageId && p.imageId <= 12 ? [`/products/${p.imageId}-2.jpg`, ...(p.imageId === 5 ? [] : [`/products/${p.imageId}-3.jpg`])] : [];
            images = [mainPhoto, ...extraPhotos.filter((ep: string) => ep !== mainPhoto)];
          }
          return { ...p, tax: p.tax || 22, changed: false, description: p.description || '', images };
        });
        setProducts(withData);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Error guardando productos');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  const hasChanges = products.some(p => p.changed);

  return (
    <div className="admin-page" style={{ paddingBottom: 100 }}>
      <main className="admin-main" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--action)', fontWeight: 700, letterSpacing: 1, fontSize: 11, marginBottom: 8 }}>ADMINISTRACIÓN DE MERCADERÍA</div>
            <h1 style={{ fontSize: 32, margin: 0, color: 'var(--ink)' }}>Gestión de Productos</h1>
            <p style={{ color: 'var(--soft)', marginTop: 8 }}>Edita de forma rápida o usa "Editar" para descripciones y múltiples fotos.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleAddProduct} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 6, color: 'var(--ink)', fontWeight: 500 }}>
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
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--soft)' }}>Cargando catálogo...</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--edge)', background: p.changed ? 'var(--raised)' : 'transparent' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--edge)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                        {p.images && p.images.length > 0 ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} /> : <ImageIcon size={18} color="var(--soft)" />}
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        value={p.sku} 
                        onChange={e => handleQuickEdit(p.id, 'sku', e.target.value)} 
                        style={{ width: 80, padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }} 
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <input 
                        value={p.name} 
                        onChange={e => handleQuickEdit(p.id, 'name', e.target.value)} 
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)', fontWeight: 500 }} 
                        onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                        onBlur={e => e.target.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <select 
                        value={p.category} 
                        onChange={e => handleQuickEdit(p.id, 'category', e.target.value)}
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
                          onChange={e => handleQuickEdit(p.id, 'price', Number(e.target.value))} 
                          style={{ width: 80, padding: '6px 8px', border: '1px solid transparent', borderRadius: 4, background: 'transparent', color: 'var(--ink)' }} 
                          onFocus={e => e.target.style.border = '1px solid var(--edge)'}
                          onBlur={e => e.target.style.border = '1px solid transparent'}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => openEditModal(p)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--action)', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }} title="Editar completo">
                          <Pencil size={14} /> Editar
                        </button>
                        <button onClick={() => handleDelete(p.id)} style={{ padding: '6px 10px', color: 'var(--soft)', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Eliminar producto">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modalMode && (
        <Dialog label={modalMode === 'add' ? "Añadir nuevo producto" : "Editar producto"} onClose={() => setModalMode(null)} className="product-modal">
          <div style={{ padding: '24px', background: 'var(--page)', width: '100%', maxWidth: '700px', borderRadius: '12px', position: 'relative' }}>
            <button onClick={() => setModalMode(null)} style={{ position: 'absolute', top: 16, right: 16, padding: 8, background: 'var(--surface)', borderRadius: '50%', color: 'var(--ink)', display: 'flex' }}>
              <X size={16} />
            </button>
            <h2 style={{ fontSize: '20px', margin: '0 0 20px', color: 'var(--ink)' }}>{modalMode === 'add' ? "Añadir nuevo producto" : "Editar producto"}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>SKU *</label>
                <input 
                  type="text" 
                  value={currentProduct.sku} 
                  onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value})} 
                  placeholder="Ej: CM-001"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>Nombre *</label>
                <input 
                  type="text" 
                  value={currentProduct.name} 
                  onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} 
                  placeholder="Nombre del material"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>Categoría</label>
                <select 
                  value={currentProduct.category} 
                  onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
                >
                  <option value="Masonería">Masonería</option>
                  <option value="Hierros y Estructuras">Hierros y Estructuras</option>
                  <option value="Herramientas">Herramientas</option>
                  <option value="Sanitaria">Sanitaria</option>
                  <option value="Electricidad">Electricidad</option>
                  <option value="Pinturería">Pinturería</option>
                  <option value="Nueva Categoría">Otra (Nueva Categoría)...</option>
                </select>
                {currentProduct.category === "Nueva Categoría" && (
                  <input 
                    type="text" 
                    placeholder="Escribe la nueva categoría"
                    value={currentProduct.newCategory} 
                    onChange={e => setCurrentProduct({...currentProduct, newCategory: e.target.value})} 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)', marginTop: '8px' }} 
                  />
                )}
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>Precio (UYU) *</label>
                    <input 
                      type="number" 
                      value={currentProduct.price} 
                      onChange={e => setCurrentProduct({...currentProduct, price: e.target.value})} 
                      placeholder="0"
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>Impuesto (IVA)</label>
                    <select 
                      value={currentProduct.tax} 
                      onChange={e => setCurrentProduct({...currentProduct, tax: Number(e.target.value)})}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
                    >
                      <option value={22}>22%</option>
                      <option value={10}>10%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)', marginBottom: '6px' }}>Descripción del producto</label>
              <textarea 
                value={currentProduct.description} 
                onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} 
                placeholder="Detalles sobre el producto, medidas, materiales, etc."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--edge)', background: 'var(--surface)', color: 'var(--ink)', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} 
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--soft)' }}>Fotos del producto</label>
                <label style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px', background: 'var(--action)', borderRadius: '6px', color: '#fff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={14} /> Subir imagen
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                </label>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: 'var(--raised)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--edge)', minHeight: '80px' }}>
                {currentProduct.images.length === 0 ? (
                  <div style={{ width: '100%', textAlign: 'center', color: 'var(--soft)', fontSize: 13, alignSelf: 'center' }}>
                    No hay imágenes. Sube una o más imágenes.
                  </div>
                ) : (
                  currentProduct.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--edge)' }}>
                      <img src={img} alt={`Imagen ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        onClick={() => removeImage(i)}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--edge)' }}>
              <button 
                onClick={() => setModalMode(null)}
                style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--edge)', borderRadius: '6px', color: 'var(--ink)', fontWeight: 500 }}
              >
                Cancelar
              </button>
              {modalMode === 'add' && (
                <button 
                  onClick={() => submitModal(true)}
                  style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--action)', borderRadius: '6px', color: 'var(--action)', fontWeight: 600 }}
                >
                  Guardar y añadir otro
                </button>
              )}
              <button 
                onClick={() => submitModal(false)}
                style={{ padding: '10px 16px', background: 'var(--action)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600 }}
              >
                Guardar
              </button>
            </div>
          </div>
        </Dialog>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
