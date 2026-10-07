"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from './sidebar';
import { AppHeader } from './header';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  tenantName?: string;
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
}

export function AppShell({
  children,
  tenantName = 'Barraca Uno',
  tenantSlug = 'barraca-uno',
  userEmail,
  userName,
  isAdmin = true,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cargar preferencia persistente de sidebar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dambru_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('dambru_sidebar_collapsed', String(next));
    } catch {}
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* 1. Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          userEmail={userEmail}
          userName={userName}
        />
      </div>

      {/* 2. Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex w-72 flex-col bg-card shadow-2xl z-50">
            <div className="absolute right-2 top-3 z-50">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            <AppSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileMenuOpen(false)}
              tenantName={tenantName}
              tenantSlug={tenantSlug}
              userEmail={userEmail}
              userName={userName}
              onNavigateMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Área Principal: Header + Contenido con Scroll */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        <AppHeader
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          userEmail={userEmail}
          userName={userName}
          isAdmin={isAdmin}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
