"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Building2,
  User,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Command,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  tenantName?: string;
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
}

export function AppHeader({
  onToggleMobileMenu,
  tenantName = 'Barraca Uno',
  tenantSlug = 'barraca-uno',
  userEmail,
  userName,
  isAdmin = true,
}: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = document.documentElement.dataset.theme;
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem('barraca-uno-theme', next);
      window.dispatchEvent(new CustomEvent('barraca-theme', { detail: next }));
    } catch {}
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/85 px-4 backdrop-blur-md sm:px-6">
      {/* Lado Izquierdo: Botón Mobile + Identidad Tenant */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="md:hidden text-foreground hover:bg-secondary"
            aria-label="Abrir menú de navegación"
          >
            <Menu size={20} />
          </Button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground tracking-tight">
              {tenantName}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              SaaS
            </span>
          </div>

          <div className="sm:hidden font-bold text-sm text-foreground">
            {tenantName}
          </div>
        </div>
      </div>

      {/* Centro: Barra de búsqueda simulada o atajos */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            readOnly
            placeholder="Buscar productos, órdenes, clientes... (Ctrl + K)"
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 text-xs text-muted-foreground shadow-2xs hover:border-primary/40 focus:outline-none cursor-pointer transition-colors"
            onClick={() => {
              // Simulación accesible de búsqueda global
              const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
              if (searchInput) searchInput.focus();
            }}
          />
        </div>
      </div>

      {/* Lado Derecho: Acciones, Theme Toggle & Perfil de Usuario */}
      <div className="flex items-center gap-2">
        {/* Enlace rápido al catálogo/storefront */}
        <Link
          href="/"
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <span>Ir al Catálogo</span>
        </Link>

        {/* Notificaciones */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </Button>

        {/* Divider */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* User Pill */}
        <Link
          href="/cuenta"
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-secondary transition-colors"
          title="Ver perfil de cuenta"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
            {userName ? userName.charAt(0).toUpperCase() : <User size={14} />}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
              {userName || userEmail || 'Administrador'}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              {isAdmin && <ShieldCheck size={10} className="text-primary" />}
              {isAdmin ? 'Admin' : 'Operador'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
