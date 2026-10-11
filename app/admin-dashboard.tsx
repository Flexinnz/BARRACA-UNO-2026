"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  Boxes,
  Users,
  RotateCw,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  PackageCheck
} from 'lucide-react';

import { MetricCard } from '@/components/arc/metric-card/metric-card';
import { LineChart, type LineChartDatum, type LineChartSeries } from '@/components/arc/line-chart/line-chart';
import { DonutChart, type DonutChartDatum } from '@/components/arc/donut-chart/donut-chart';
import SegmentedControl from '@/components/arc/segmented-control/segmented-control';
import { Button } from '@/components/arc/button/button';
import { Badge } from '@/components/arc/badge/badge';
import { Skeleton } from '@/components/arc/skeleton/skeleton';
import { Alert } from '@/components/arc/alert/alert';
import { Progress } from '@/components/arc/progress/progress';
import { motionTokens } from '@/components/arc/lib/motion-tokens';

import styles from './admin-dashboard.module.css';

export interface DashboardRecentOrder {
  id: string;
  status: string;
  total: number;
  clientName?: string;
  paymentMethod?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  pendingOrders: number;
  averageTicket?: number;
  deliveryRate?: number;
  users: number;
  totalOrders?: number;
  trend?: LineChartDatum[];
  statusDistribution?: DonutChartDatum[];
  recentOrders: DashboardRecentOrder[];
  error?: string;
}

const statusBadgeTone: Record<string, "warning" | "info" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const rangeOptions = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "Trimestre" },
];

export function DashboardSection() {
  const [stats, setStats] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState("30d");
  const prefersReducedMotion = useReducedMotion();

  const loadData = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/dashboard')
      .then((res) => res.json() as Promise<DashboardMetrics>)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
        }
      })
      .catch((err: Error) => {
        setError(err.message || 'No fue posible cargar las métricas');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartSeries: LineChartSeries[] = useMemo(() => [
    {
      key: "revenue",
      label: "Ingresos (UYU)",
      color: "var(--accent, #3b82f6)",
      area: true,
    },
    {
      key: "orders",
      label: "Pedidos",
      color: "#8b5cf6",
      dashed: true,
      area: false,
    }
  ], []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: prefersReducedMotion ? { duration: 0 } : {
        staggerChildren: 0.07,
        delayChildren: 0.05,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion ? { duration: 0 } : motionTokens.spring.smooth,
    }
  };

  if (error) {
    return (
      <div className={styles.dashboardContainer}>
        <Alert tone="danger" title="Error cargando métricas del negocio">
          <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Reintentar
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <main className={styles.dashboardContainer} aria-label="Panel de métricas principal">
      {/* Header */}
      <motion.header
        className={styles.header}
        initial="hidden"
        animate="show"
        variants={itemVariants}
      >
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Panel de control</h1>
            <Badge tone="success">
              Sistema activo
            </Badge>
          </div>
          <p className={styles.subtitle}>
            Monitoreo en tiempo real de órdenes, ingresos y despacho de materiales
          </p>
        </div>

        <div className={styles.headerActions}>
          <SegmentedControl
            label="Rango de tiempo"
            options={rangeOptions}
            value={selectedRange}
            onValueChange={setSelectedRange}
          />
          <Button
            variant="secondary"
            onClick={loadData}
            aria-label="Actualizar métricas"
          >
            <RotateCw size={15} strokeWidth={1.75} aria-hidden="true" />
            Actualizar
          </Button>
        </div>
      </motion.header>

      {/* KPI Cards Row */}
      <motion.section
        className={styles.kpiGrid}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        aria-label="Indicadores clave"
        aria-busy={loading}
      >
        {loading || !stats ? (
          <>
            <div className={styles.surfaceCard}><Skeleton lines={3} /></div>
            <div className={styles.surfaceCard}><Skeleton lines={3} /></div>
            <div className={styles.surfaceCard}><Skeleton lines={3} /></div>
            <div className={styles.surfaceCard}><Skeleton lines={3} /></div>
          </>
        ) : (
          <>
            <motion.div variants={itemVariants} className={styles.kpiCardWrapper}>
              <MetricCard
                label="Ingresos totales"
                value={stats.totalRevenue}
                prefix="$"
                change="+12.4%"
                context="vs mes anterior"
              />
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCardWrapper}>
              <MetricCard
                label="Pedidos pendientes"
                value={stats.pendingOrders}
                change={stats.pendingOrders > 0 ? "Requiere acción" : "Al día"}
                context="órdenes por despachar"
              />
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCardWrapper}>
              <MetricCard
                label="Ticket promedio"
                value={stats.averageTicket || Math.round(stats.totalRevenue / (stats.totalOrders || 1))}
                prefix="$"
                change="+4.8%"
                context="promedio por orden"
              />
            </motion.div>

            <motion.div variants={itemVariants} className={styles.kpiCardWrapper}>
              <MetricCard
                label="Efectividad de entrega"
                value={stats.deliveryRate ?? 95}
                suffix="%"
                change="+2.1%"
                context="pedidos completados"
              />
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Charts Grid */}
      <motion.section
        className={styles.chartsGrid}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Trend Line Chart */}
        <motion.div className={styles.surfaceCard} variants={itemVariants}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}>Evolución de ventas y pedidos</h2>
              <p className={styles.cardDescription}>Ingresos recaudados y volumen de órdenes procesadas</p>
            </div>
            <Badge tone="neutral">
              UYU
            </Badge>
          </div>

          <div className={styles.chartContent}>
            {loading || !stats ? (
              <Skeleton lines={7} />
            ) : stats.trend && stats.trend.length > 0 ? (
              <LineChart
                label="Ventas y pedidos"
                data={stats.trend}
                series={chartSeries}
                height={280}
                formatValue={(val, s) => s.key === "revenue" ? `$${val.toLocaleString('es-UY')}` : `${val} pedidos`}
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay suficientes datos de tendencia registrados en este rango.
              </div>
            )}
          </div>
        </motion.div>

        {/* Status Distribution Donut Chart */}
        <motion.div className={styles.surfaceCard} variants={itemVariants}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}>Estado de órdenes</h2>
              <p className={styles.cardDescription}>Distribución según fase de entrega</p>
            </div>
          </div>

          <div className={styles.chartContent}>
            {loading || !stats ? (
              <Skeleton lines={7} />
            ) : stats.statusDistribution && stats.statusDistribution.length > 0 ? (
              <DonutChart
                label="Distribución por estado"
                data={stats.statusDistribution}
                totalLabel="Total órdenes"
                size={220}
                thickness={28}
                legend
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay órdenes registradas.
              </div>
            )}
          </div>
        </motion.div>
      </motion.section>

      {/* Bottom Section: Recent Orders & Quick Management */}
      <motion.section
        className={styles.bottomGrid}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Recent Orders Card */}
        <motion.div className={styles.surfaceCard} variants={itemVariants}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}>Órdenes recientes</h2>
              <p className={styles.cardDescription}>Últimos pedidos registrados en el sistema</p>
            </div>
            <Link
              href="/pedidos-admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--accent)',
                textDecoration: 'none'
              }}
            >
              Ver todas
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.tableContainer}>
            {loading || !stats ? (
              <div style={{ padding: 24 }}><Skeleton lines={5} /></div>
            ) : stats.recentOrders.length === 0 ? (
              <div style={{ padding: 24 }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No hay órdenes recientes registradas.</p>
              </div>
            ) : (
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>Identificador</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => {
                    const tone = statusBadgeTone[order.status] || "neutral";
                    const label = statusLabels[order.status] || order.status;
                    return (
                      <tr
                        key={order.id}
                        className={styles.orderRow}
                        onClick={() => window.location.href = '/pedidos-admin'}
                      >
                        <td>
                          <span className={styles.orderId}>{order.id}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{order.clientName || 'Cliente'}</span>
                        </td>
                        <td>
                          <span className={styles.orderAmount}>
                            ${order.total.toLocaleString('es-UY')}
                          </span>
                        </td>
                        <td>
                          <Badge tone={tone}>
                            {label}
                          </Badge>
                        </td>
                        <td>
                          <span className={styles.orderDate}>
                            {new Date(order.created_at).toLocaleDateString('es-UY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Side Column: Performance Goals & Quick Access */}
        <motion.div className={styles.sideColumn} variants={itemVariants}>
          {/* Performance Targets Card */}
          <div className={styles.surfaceCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>Metas operativas</h3>
                <p className={styles.cardDescription}>Cumplimiento del período en curso</p>
              </div>
            </div>

            <div className={styles.goalRow}>
              <div className={styles.goalHeader}>
                <span className={styles.goalLabel}>Objetivo mensual ventas</span>
                <span className={styles.goalValue}>78%</span>
              </div>
              <Progress value={78} />
            </div>

            <div className={styles.goalRow}>
              <div className={styles.goalHeader}>
                <span className={styles.goalLabel}>Tasa de satisfacción</span>
                <span className={styles.goalValue}>92%</span>
              </div>
              <Progress value={92} />
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className={styles.surfaceCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>Acciones rápidas</h3>
                <p className={styles.cardDescription}>Accesos directos de gestión</p>
              </div>
            </div>

            <div className={styles.actionsList}>
              <Link href="/stock" className={styles.actionButton}>
                <span className={styles.actionIconGroup}>
                  <Boxes size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                  Gestionar catálogo y stock
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>

              <Link href="/pedidos-admin" className={styles.actionButton}>
                <span className={styles.actionIconGroup}>
                  <ShoppingBag size={16} strokeWidth={1.75} style={{ color: 'var(--success)' }} />
                  Despachar pedidos pendientes
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>

              <Link href="/clientes" className={styles.actionButton}>
                <span className={styles.actionIconGroup}>
                  <Users size={16} strokeWidth={1.75} style={{ color: '#8b5cf6' }} />
                  Directorio de clientes y cuentas
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.section>
    </main>
  );
}
