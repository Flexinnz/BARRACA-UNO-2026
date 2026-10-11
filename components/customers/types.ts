export interface Customer {
  userId: string;
  email: string;
  displayName: string;
  company: string;
  phone: string;
  bio: string;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
  tenantRole?: string | null;
  platformRole?: string | null;
}

export interface CustomerOrder {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
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
}

export interface CustomerDetail extends Customer {
  orders: CustomerOrder[];
}

export interface CustomerMetrics {
  total: number;
  connectedToday: number;
  buyers: number;
  newClients: number;
  vipClients: number;
  totalRevenue: number;
  avgTicket: number;
}

export type CustomerSegment = 'all' | 'today' | 'new' | 'buyers' | 'vip';

export interface SegmentInfo {
  label: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export function formatMoney(v: number): string {
  try {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      maximumFractionDigits: 0,
    }).format(v || 0);
  } catch {
    return `$ ${Math.round(v || 0)}`;
  }
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return 'Sin fecha';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-UY', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Montevideo',
    }).format(d);
  } catch {
    return String(v || 'Sin fecha');
  }
}

export function isConnectedToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 && d.getDate() === now.getDate();
  } catch {
    return false;
  }
}

export function getCustomerSegment(customer: Customer): SegmentInfo {
  if ((customer.totalSpent || 0) >= 5000) {
    return {
      label: 'Cliente VIP',
      icon: '⭐',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      description: 'Compras acumuladas mayores a $ 5.000 UYU.',
    };
  }
  if ((customer.ordersCount || 0) >= 2) {
    return {
      label: 'Recurrente',
      icon: '🔄',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      description: 'Cliente con dos o más pedidos confirmados.',
    };
  }
  if ((customer.ordersCount || 0) === 1) {
    return {
      label: 'Comprador',
      icon: '🛍️',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      description: 'Cliente con una compra registrada en el catálogo.',
    };
  }
  return {
    label: 'Nuevo',
    icon: '✨',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    description: 'Cuenta registrada sin compras todavía.',
  };
}
