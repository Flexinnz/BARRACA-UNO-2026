import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  maxWidth?: 'default' | 'full' | 'narrow';
  className?: string;
}

export function PageContainer({
  children,
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  maxWidth = 'default',
  className,
}: PageContainerProps) {
  const maxWidthClass = {
    default: 'max-w-7xl',
    full: 'max-w-none',
    narrow: 'max-w-5xl',
  }[maxWidth];

  return (
    <div className={cn('w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6', maxWidthClass, className)}>
      {/* 1. Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Ruta de navegación" className="flex items-center text-xs text-muted-foreground gap-1.5">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground font-medium transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-foreground font-semibold' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* 2. Page Header con Título, Eyebrow, Descripción y Acciones */}
      {(title || eyebrow || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
          <div className="space-y-1">
            {eyebrow && (
              <div className="text-[11px] font-bold tracking-wider text-primary uppercase">
                {eyebrow}
              </div>
            )}
            {title && (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* 3. Contenido Principal */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
