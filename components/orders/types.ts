import { Clock, CheckCircle2, Truck, Check, XCircle, AlertTriangle } from 'lucide-react';

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus | string;
  paymentMethod: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  itemsSummary: string;
  // Campos alternativos snake_case soportados por la API
  user_id?: string;
  user_email?: string;
  user_name?: string;
  payment_method?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_phone?: string;
  created_at?: string;
  updated_at?: string;
  items_summary?: string;
}

export interface OrderItem {
  id: number;
  orderId: string;
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  // Campos alternativos snake_case
  order_id?: string;
  product_id?: number;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
  unit_price?: number;
  line_total?: number;
}

export type OrderStatus = 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';

export interface StatusConfigItem {
  label: string;
  badgeClass: string;
  borderClass: string;
  dotColor: string;
  icon: typeof Clock;
  description: string;
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  pending: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    borderClass: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    icon: Clock,
    description: 'A la espera de confirmación de pago o revisión.',
  },
  approved: {
    label: 'Aprobado',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    borderClass: 'border-sky-500/30',
    dotColor: 'bg-sky-500',
    icon: CheckCircle2,
    description: 'Pago recibido / confirmado; listo para preparar en depósito.',
  },
  shipped: {
    label: 'En camino',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    borderClass: 'border-indigo-500/30',
    dotColor: 'bg-indigo-500',
    icon: Truck,
    description: 'Despachado del depósito; en ruta de flete o transporte.',
  },
  delivered: {
    label: 'Entregado',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    icon: Check,
    description: 'Mercadería recibida por el cliente y liquidada.',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    borderClass: 'border-rose-500/30',
    dotColor: 'bg-rose-500',
    icon: XCircle,
    description: 'Orden anulada o rechazada.',
  },
};

export const formatMoney = (v: number | undefined | null) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(v || 0);

export const formatDate = (v: string | undefined | null) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    return (
      new Intl.DateTimeFormat('es-UY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Montevideo',
      }).format(d) + ' hs'
    );
  } catch {
    return String(v || '—');
  }
};
