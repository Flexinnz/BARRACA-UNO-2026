"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Users,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Sparkles,
  ExternalLink,
  Store,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  external?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const SAAS_NAV_SECTIONS: NavSection[] = [
  {
    title: 'GENERAL',
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      {
        title: 'Catálogo & Tienda',
        href: '/',
        icon: Store,
      },
      {
        title: 'Inventario & Stock',
        href: '/stock',
        icon: Boxes,
      },
      {
        title: 'Gestión de Pedidos',
        href: '/pedidos-admin',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'CLIENTES & CRM',
    items: [
      {
        title: 'Directorio Clientes',
        href: '/clientes',
        icon: Users,
      },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      {
        title: 'Usuarios & Roles',
        href: '/administracion',
        icon: ShieldCheck,
      },
      {
        title: 'Configuración',
        href: '/cuenta',
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  tenantName?: string;
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  onNavigateMobile?: () => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  tenantName = 'Barraca Uno',
  tenantSlug = 'barraca-uno',
  userEmail,
  userName,
  onNavigateMobile,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-card border-r border-border transition-all duration-300 z-30 select-none',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      aria-label="Navegación principal"
    >
      {/* 1. Header del Tenant / Brand */}
      <div className="flex items-center h-16 px-4 border-b border-border/70 shrink-0 gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-bold text-base shadow-sm shrink-0">
          <Building2 size={20} />
        </div>

        {!collapsed && (
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="font-semibold text-sm tracking-tight text-foreground truncate">
              {tenantName}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-muted-foreground truncate">
                Dambru SaaS
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Lista de Navegación por Módulos */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6">
        {SAAS_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {section.title}
              </div>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigateMobile}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <Icon
                      size={18}
                      className={cn(
                        'shrink-0 transition-transform duration-150 group-hover:scale-105',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1 text-xs sm:text-sm">
                        {item.title}
                      </span>
                    )}

                    {!collapsed && item.badge && (
                      <Badge
                        variant={item.badgeVariant ?? 'secondary'}
                        className="text-[10px] px-1.5 py-0 font-bold"
                      >
                        {item.badge}
                      </Badge>
                    )}

                    {/* Active Indicator Bar on Collapsed */}
                    {collapsed && isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-md" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Footer del Sidebar con Tenant Status y Collapse Button */}
      <div className="p-3 border-t border-border shrink-0 bg-secondary/30 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-card border border-border p-2.5 text-xs text-muted-foreground flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 truncate">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate font-medium text-foreground">
                Tenant: {tenantSlug}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-primary shrink-0 px-1 py-0.5 rounded bg-primary/10">
              Activo
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          {/* Botón de colapso desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
              collapsed ? 'w-full' : 'w-auto'
            )}
            title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span className="text-xs font-medium ml-2">Colapsar</span>}
          </button>

          {!collapsed && (
            <Link
              href="/auth/logout"
              className="flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span>Salir</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
