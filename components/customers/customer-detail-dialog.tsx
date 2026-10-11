import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Phone,
  Mail,
  Building,
  Calendar,
  Clock,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Edit2,
  Save,
  X,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Customer,
  CustomerOrder,
  CustomerDetail,
  formatDate,
  formatMoney,
  isConnectedToday,
  getCustomerSegment,
} from './types';

interface CustomerDetailDialogProps {
  customer: Customer | null;
  onClose: () => void;
  onSaveCustomer: (updated: Partial<Customer>) => Promise<boolean>;
  saving: boolean;
}

export function CustomerDetailDialog({
  customer,
  onClose,
  onSaveCustomer,
  saving,
}: CustomerDetailDialogProps) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  // Modo edición
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('active');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!customer) {
      setDetail(null);
      setIsEditing(false);
      setFeedback(null);
      return;
    }

    setDisplayName(customer.displayName || '');
    setCompany(customer.company || '');
    setPhone(customer.phone || '');
    setBio(customer.bio || '');
    setStatus(customer.status || 'active');
    setIsEditing(false);
    setFeedback(null);

    // Cargar ficha completa con historial de pedidos del servidor
    setLoadingOrders(true);
    fetch(`/api/admin/customers?userId=${encodeURIComponent(customer.userId)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar la ficha completa.');
        const data = (await res.json()) as { customer?: CustomerDetail };
        if (data.customer) {
          setDetail(data.customer);
          setDisplayName(data.customer.displayName || '');
          setCompany(data.customer.company || '');
          setPhone(data.customer.phone || '');
          setBio(data.customer.bio || '');
          setStatus(data.customer.status || 'active');
        }
      })
      .catch((err) => {
        console.error('Error fetching customer detail:', err);
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, [customer]);

  if (!customer) return null;

  const current = detail || customer;
  const segment = getCustomerSegment(current);
  const online = isConnectedToday(current.lastSeenAt);

  const cleanPhone = (current.phone || '').replace(/[^0-9]/g, '');
  const waNumber = cleanPhone.startsWith('0')
    ? '598' + cleanPhone.slice(1)
    : cleanPhone.startsWith('598') || cleanPhone.length !== 8
    ? cleanPhone
    : '598' + cleanPhone;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const success = await onSaveCustomer({
      userId: current.userId,
      displayName,
      company,
      phone,
      bio,
      status,
    });

    if (success) {
      setFeedback({ type: 'success', message: 'Datos del cliente actualizados correctamente.' });
      setIsEditing(false);
      if (detail) {
        setDetail({
          ...detail,
          displayName,
          company,
          phone,
          bio,
          status,
        });
      }
    } else {
      setFeedback({ type: 'error', message: 'No se pudieron guardar los cambios.' });
    }
  };

  const orders = detail?.orders || [];

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 bg-card rounded-2xl shadow-xl">
        {/* Encabezado */}
        <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-full bg-primary/10 text-primary font-semibold text-base flex items-center justify-center shrink-0 border border-primary/20">
                {(current.displayName || current.email || 'CL').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {current.displayName || 'Sin nombre registrado'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {current.email}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${segment.badgeClass}`}
              >
                <span>{segment.icon}</span>
                <span>{segment.label}</span>
              </span>
            </div>
          </div>

          {/* Banner de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <div className="p-2.5 rounded-lg bg-background border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground block">Total invertido</span>
              <strong className="text-sm font-mono text-foreground font-semibold">
                {formatMoney(current.totalSpent || 0)}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground block">Pedidos realizados</span>
              <strong className="text-sm font-mono text-foreground font-semibold">
                {current.ordersCount || 0}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground block">Estado de cuenta</span>
              <span
                className={`text-xs font-medium ${
                  current.status === 'blocked' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {current.status === 'blocked' ? 'Bloqueada' : 'Activa'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border/60 text-center">
              <span className="text-[11px] text-muted-foreground block">Última actividad</span>
              <span className="text-xs font-medium text-foreground">
                {online ? '🟢 Conectado hoy' : formatDate(current.lastSeenAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 sm:mx-6 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Selector de Pestañas */}
        <div className="flex items-center px-5 sm:px-6 pt-4 border-b border-border/60 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Ficha de contacto y empresa
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Historial de pedidos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-foreground">
              {current.ordersCount || 0}
            </span>
          </button>
        </div>

        {/* Contenido de la Ficha */}
        <div className="p-5 sm:p-6 space-y-5">
          {activeTab === 'profile' ? (
            <div>
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Nombre completo
                      </label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nombre y apellido"
                        className="h-9 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Empresa / Obra
                      </label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ej. Constructora del Este"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Teléfono de contacto
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej. 099 123 456"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Estado de cuenta
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="active">Activa</option>
                        <option value="blocked">Bloqueada</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      Observaciones y notas CRM
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Preferencias de entrega, condiciones comerciales, notas internas..."
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="h-8 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={saving}
                      className="h-8 gap-1.5 text-xs font-medium shadow-xs"
                    >
                      <Save size={14} />
                      <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Información comercial y contacto
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-7 gap-1 text-xs font-medium shadow-xs"
                    >
                      <Edit2 size={12} />
                      <span>Editar datos</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                    <div>
                      <span className="text-xs text-muted-foreground block">Empresa / Constructora</span>
                      <strong className="text-sm text-foreground font-medium mt-0.5 block">
                        {current.company || 'Cliente particular'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Teléfono</span>
                      <strong className="text-sm text-foreground font-medium mt-0.5 block">
                        {current.phone || 'No registrado'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Fecha de registro</span>
                      <span className="text-sm text-foreground mt-0.5 block">
                        {formatDate(current.createdAt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Fecha del último pedido</span>
                      <span className="text-sm text-foreground mt-0.5 block">
                        {current.lastOrderAt ? formatDate(current.lastOrderAt) : 'Sin pedidos aún'}
                      </span>
                    </div>
                  </div>

                  {current.bio && (
                    <div className="bg-muted/20 p-4 rounded-xl border border-border/60">
                      <span className="text-xs text-muted-foreground block mb-1">
                        Notas y observaciones CRM
                      </span>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {current.bio}
                      </p>
                    </div>
                  )}

                  {/* Acciones de Contacto Directo */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <MessageCircle size={14} />
                        <span>Contactar por WhatsApp</span>
                      </a>
                    )}

                    <a
                      href={`mailto:${current.email}?subject=Contacto%20desde%20Barraca%20Uno`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border/60 shadow-xs"
                    >
                      <Mail size={14} />
                      <span>Enviar correo</span>
                    </a>

                    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium shadow-xs">
                      <Link href="/pedidos-admin">
                        <ShoppingBag size={14} />
                        <span>Ver todos los pedidos</span>
                        <ExternalLink size={12} />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {loadingOrders ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border/50 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 rounded-xl border border-border/60">
                  <ShoppingBag size={24} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Aún no ha realizado pedidos
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Las compras generadas en la tienda aparecerán reflejadas aquí en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl border border-border/60 bg-background hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-mono text-foreground font-semibold">
                            {o.id}
                          </strong>
                          <span className="text-[11px] text-muted-foreground">
                            · {formatDate(o.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-sm">
                          {o.shippingCity ? `${o.shippingCity} · ` : ''}
                          {o.shippingAddress || 'Retiro en depósito'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border/60">
                          {o.status}
                        </span>
                        <strong className="text-sm font-mono text-foreground font-semibold">
                          {formatMoney(o.total)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
