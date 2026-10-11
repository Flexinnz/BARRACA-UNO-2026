import React from 'react';
import {
  Users,
  Phone,
  Mail,
  ShoppingBag,
  ArrowUpRight,
  UserX,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Customer,
  formatDate,
  formatMoney,
  isConnectedToday,
  getCustomerSegment,
} from './types';

interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onClearFilters?: () => void;
}

function getInitials(name: string, email: string): string {
  const target = (name || email || '').trim();
  if (!target) return 'CL';
  const parts = target.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
}

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '598' + digits.slice(1);
  }
  if (!digits.startsWith('598') && digits.length === 8) {
    return '598' + digits;
  }
  return digits;
}

export function CustomersTable({
  customers,
  loading,
  onSelectCustomer,
  onClearFilters,
}: CustomersTableProps) {
  if (loading) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-xs">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 hidden md:block" />
              <Skeleton className="h-6 w-24 hidden lg:block" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="w-full bg-card rounded-xl border border-border/60 p-12 text-center shadow-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <UserX size={24} />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          No se encontraron clientes
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          No hay clientes que coincidan con la búsqueda o todavía no se registraron clientes en esta organización.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Limpiar filtros de búsqueda
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-xl border border-border/60 overflow-hidden shadow-xs">
      {/* Desktop / Tablet Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[840px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 hidden md:table-cell">Empresa / Obra</th>
              <th className="py-3 px-4">Contacto directo</th>
              <th className="py-3 px-4">Segmento</th>
              <th className="py-3 px-4 text-right">Total invertido (LTV)</th>
              <th className="py-3 px-4 text-center hidden sm:table-cell">Pedidos</th>
              <th className="py-3 px-4 hidden lg:table-cell">Última actividad</th>
              <th className="py-3 px-4 text-right">Ficha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {customers.map((c) => {
              const segment = getCustomerSegment(c);
              const online = isConnectedToday(c.lastSeenAt);
              const waNumber = cleanPhoneForWhatsApp(c.phone);
              const initials = getInitials(c.displayName, c.email);

              return (
                <tr
                  key={c.userId}
                  onClick={() => onSelectCustomer(c)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  {/* Cliente / Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {c.displayName || 'Sin nombre registrado'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Empresa / Obra */}
                  <td className="py-3 px-4 hidden md:table-cell">
                    {c.company ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground border border-border/60 max-w-[160px] truncate">
                        {c.company}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Particular</span>
                    )}
                  </td>

                  {/* Contacto Directo */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {waNumber ? (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                          title={`Escribir por WhatsApp a ${c.phone}`}
                        >
                          <MessageCircle size={13} />
                          <span className="hidden xl:inline">{c.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin teléfono</span>
                      )}

                      <a
                        href={`mailto:${c.email}?subject=Contacto%20desde%20Barraca%20Uno`}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Enviar correo electrónico"
                      >
                        <Mail size={14} />
                      </a>
                    </div>
                  </td>

                  {/* Segmento */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${segment.badgeClass}`}
                    >
                      <span>{segment.icon}</span>
                      <span>{segment.label}</span>
                    </span>
                  </td>

                  {/* Total Invertido */}
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-medium text-foreground">
                      {formatMoney(c.totalSpent || 0)}
                    </span>
                  </td>

                  {/* Pedidos */}
                  <td className="py-3 px-4 text-center hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground border border-border/50">
                      <ShoppingBag size={11} className="text-muted-foreground" />
                      <span>{c.ordersCount || 0}</span>
                    </span>
                  </td>

                  {/* Última Actividad */}
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {online ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Conectado hoy
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.lastSeenAt)}
                      </span>
                    )}
                  </td>

                  {/* Ficha & Acciones */}
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs font-medium shadow-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(c);
                      }}
                    >
                      <span>Ficha</span>
                      <ArrowUpRight size={13} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
