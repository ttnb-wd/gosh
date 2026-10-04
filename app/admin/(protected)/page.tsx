"use client";
import StudioErrorText from "@/components/ui/StudioErrorText";
import devLog from "@/lib/dev-log";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { PageErrorBoundary } from "@/components/ErrorBoundaries";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Clock,
  DollarSign,
  Inbox,
  LucideIcon,
  Package,
  RefreshCw,
  ShoppingBag,
  Users,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  stock: number;
  is_active: boolean;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  totalRevenue: number;
  unpaidOrders: number;
  verifyingPayments: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  unreadMessages: number;
}

interface BreakdownItem {
  label: string;
  value: number;
}

interface DashboardData {
  stats: DashboardStats;
  lowStockList: Product[];
  categoryBreakdown: BreakdownItem[];
  paymentBreakdown: BreakdownItem[];
  statusBreakdown: BreakdownItem[];
}

const emptyStats: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  processingOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  todayOrders: 0,
  totalRevenue: 0,
  unpaidOrders: 0,
  verifyingPayments: 0,
  totalProducts: 0,
  activeProducts: 0,
  lowStockProducts: 0,
  totalCustomers: 0,
  unreadMessages: 0,
};

const formatMoney = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;
const orderStatuses = ["Pending", "Confirmed", "Processing", "Delivered", "Cancelled"] as const;
const paymentStatuses = ["Unpaid", "Paid", "Verifying", "Failed", "Refunded"] as const;

const getStartOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const toBreakdown = <T,>(items: T[], getLabel: (item: T) => string | null | undefined) => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = getLabel(item)?.trim() || "Uncategorized";
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

function DashboardPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="studio-admin-panel">
      <div className="studio-admin-panel-heading">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function BreakdownList({ items, emptyText }: { items: BreakdownItem[]; emptyText: string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <p className="text-sm font-semibold text-muted">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 6).map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold text-muted">{item.label}</span>
            <span className="font-semibold text-ink">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function OperationalFlag({
  href,
  icon: Icon,
  title,
  detail,
  value,
  tone = "neutral",
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  value: number;
  tone?: "neutral" | "warning" | "danger";
}) {
  const styles = {
    neutral: "border-line bg-surface hover:border-line hover:bg-surface hover:shadow-panel      ",
    warning: "border-line bg-surface/70 hover:border-line hover:bg-surface hover:shadow-panel       ",
    danger: "border-destructive bg-destructive-soft/40 hover:border-destructive      ",
  };

  const iconStyles = {
    neutral: "bg-surface text-muted group-hover:bg-surface     ",
    warning: "bg-accent-soft text-brand group-hover:bg-surface     ",
    danger: "bg-destructive-soft text-destructive     ",
  };
  const highlightIcon = title === "Verify Payments" || title === "Confirm Orders";

  return (
    <Link
      href={href}
      className={`admin-operational-flag admin-operational-flag-${tone} group flex min-w-0 flex-col items-start gap-4 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between ${styles[tone]}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`admin-operational-flag-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyles[tone]}`}>
          <Icon className={`h-5 w-5 ${highlightIcon ? "admin-operational-flag-highlight-icon" : ""}`} strokeWidth={highlightIcon ? 2.75 : 2} />
        </div>
        <div className="min-w-0">
          <p className="admin-operational-flag-title font-semibold text-ink">{title}</p>
          <p className="admin-operational-flag-detail mt-1 text-xs font-semibold leading-snug text-muted sm:truncate">{detail}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <span className="admin-operational-flag-value text-xl font-semibold text-ink transition group-hover:text-accent  ">{value}</span>
        <ArrowRight className="admin-operational-flag-arrow h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-accent  " />
      </div>
    </Link>
  );
}

function AdminDashboardContent() {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: emptyStats,
    lowStockList: [],
    categoryBreakdown: [],
    paymentBreakdown: [],
    statusBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [authLoading, user, isAdmin]);

  const loadDashboard = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const todayStart = getStartOfToday();
      const todayStartMs = todayStart.getTime();

      const [productsSnap, ordersSnap, usersSnap, messagesSnap] =
        await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(
            query(collection(db, "orders"), orderBy("created_at", "desc"))
          ),
          getDocs(collection(db, "users")),
          getDocs(
            query(
              collection(db, "messages"),
              where("status", "==", "unread")
            )
          ),
        ]);

      const products = productsSnap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          name: (data.name as string) || "",
          brand: (data.brand as string) || null,
          category: (data.category as string) || null,
          stock: Number(data.stock ?? 0) || 0,
          is_active: data.is_active !== false,
        };
      });

      const orders = ordersSnap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdRaw = data.created_at;

        let createdMs = 0;
        if (createdRaw) {
          if (typeof createdRaw === "object" && "toMillis" in createdRaw) {
            createdMs = (createdRaw as { toMillis: () => number }).toMillis();
          } else if (typeof createdRaw === "number") {
            createdMs = createdRaw;
          } else if (typeof createdRaw === "string") {
            createdMs = new Date(createdRaw).getTime();
          }
        }

        return {
          total: Number(data.total ?? 0) || 0,
          status: (data.status as string) || "",
          payment_status: (data.payment_status as string) || "",
          created_ms: createdMs,
        };
      });

      const activeProducts = products.filter((p) => p.is_active);
      const lowStockProducts = activeProducts.filter((p) => p.stock <= 5);
      const paidOrders = orders.filter((o) => o.payment_status === "Paid");
      const todayOrders = orders.filter(
        (o) => o.created_ms >= todayStartMs
      );

      const statusBreakdown = orderStatuses
        .map((status) => ({
          label: status,
          value: orders.filter((o) => o.status === status).length,
        }))
        .filter((item) => item.value > 0);

      const paymentBreakdown = paymentStatuses
        .map((status) => ({
          label: status,
          value: orders.filter((o) => o.payment_status === status).length,
        }))
        .filter((item) => item.value > 0);

      setDashboardData({
        stats: {
          totalOrders: orders.length,
          pendingOrders:
            statusBreakdown.find((s) => s.label === "Pending")?.value || 0,
          processingOrders:
            statusBreakdown.find((s) => s.label === "Processing")?.value || 0,
          deliveredOrders:
            statusBreakdown.find((s) => s.label === "Delivered")?.value || 0,
          cancelledOrders:
            statusBreakdown.find((s) => s.label === "Cancelled")?.value || 0,
          todayOrders: todayOrders.length,
          totalRevenue: paidOrders.reduce(
            (sum, o) => sum + o.total,
            0
          ),
          unpaidOrders:
            paymentBreakdown.find((s) => s.label === "Unpaid")?.value || 0,
          verifyingPayments:
            paymentBreakdown.find((s) => s.label === "Verifying")?.value || 0,
          totalProducts: products.length,
          activeProducts: activeProducts.length,
          lowStockProducts: lowStockProducts.length,
          totalCustomers: usersSnap.size,
          unreadMessages: messagesSnap.size,
        },
        lowStockList: lowStockProducts
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 6),
        categoryBreakdown: toBreakdown(products, (p) => p.category),
        paymentBreakdown,
        statusBreakdown,
      });
    } catch (err) {
      devLog.error("Dashboard load error:", err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const averageOrderValue = useMemo(() => {
    if (dashboardData.stats.totalOrders === 0) return 0;
    return dashboardData.stats.totalRevenue / dashboardData.stats.totalOrders;
  }, [dashboardData.stats.totalOrders, dashboardData.stats.totalRevenue]);

  const fulfillmentRate = useMemo(() => {
    if (dashboardData.stats.totalOrders === 0) return 0;
    return Math.round((dashboardData.stats.deliveredOrders / dashboardData.stats.totalOrders) * 100);
  }, [dashboardData.stats.deliveredOrders, dashboardData.stats.totalOrders]);

  const activeProductRate = useMemo(() => {
    if (dashboardData.stats.totalProducts === 0) return 0;
    return Math.round((dashboardData.stats.activeProducts / dashboardData.stats.totalProducts) * 100);
  }, [dashboardData.stats.activeProducts, dashboardData.stats.totalProducts]);

  return (
    <div className="min-h-screen">
      <AdminHeader title="Dashboard" subtitle="Store operations overview" />

      {/* Screen Reader Loading Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {loading ? "Loading dashboard data, please wait..." : "Dashboard data loaded"}
      </div>

      <main role="main" className="studio-admin-content">
        <div className="studio-admin-toolbar">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Live Summary</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Today&apos;s Store Snapshot</h2>
            <p className="mt-1 text-sm text-muted">
              A considered view of orders, payments, inventory, and customer care.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-brand px-5 py-3 text-sm font-semibold text-on-brand shadow-panel transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Dashboard
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive">
            <StudioErrorText message={error} />
          </div>
        )}

        <div className="studio-admin-stats">
          <StatCard title="Revenue Collected" value={formatMoney(dashboardData.stats.totalRevenue)} icon={DollarSign} trend={`${formatMoney(averageOrderValue)} avg order`} trendUp />
          <StatCard title="Orders Today" value={dashboardData.stats.todayOrders} icon={ShoppingBag} trend={`${dashboardData.stats.pendingOrders} pending`} trendUp={dashboardData.stats.pendingOrders === 0} />
          <StatCard title="Payments To Check" value={dashboardData.stats.verifyingPayments + dashboardData.stats.unpaidOrders} icon={Clock} trend={`${dashboardData.stats.verifyingPayments} verifying`} trendUp={false} />
          <StatCard title="Unread Messages" value={dashboardData.stats.unreadMessages} icon={Inbox} trend="From contact form" trendUp={dashboardData.stats.unreadMessages === 0} />
        </div>

        <div className="studio-admin-stats mt-4">
          <StatCard title="Total Customers" value={dashboardData.stats.totalCustomers} icon={Users} />
          <StatCard title="Active Products" value={`${dashboardData.stats.activeProducts}/${dashboardData.stats.totalProducts}`} icon={Package} trend={`${activeProductRate}% active`} trendUp />
          <StatCard title="Low Stock Items" value={dashboardData.stats.lowStockProducts} icon={AlertTriangle} trend="5 or fewer left" trendUp={dashboardData.stats.lowStockProducts === 0} />
          <StatCard title="Fulfillment Rate" value={`${fulfillmentRate}%`} icon={CheckCircle2} trend={`${dashboardData.stats.deliveredOrders} delivered`} trendUp />
        </div>

        <div className="mt-6 grid gap-6">
          <DashboardPanel
            title="Quick Actions"
            action={<BarChart3 className="h-5 w-5 text-accent" />}
          >
            <div className="studio-admin-shortcuts">
              <ActionLink href="/admin/orders" icon={ShoppingBag} label="Manage Orders" />
              <ActionLink href="/admin/products" icon={Package} label="Update Products" />
              <ActionLink href="/admin/customers" icon={Users} label="Review Customers" />
              <ActionLink href="/admin/messages" icon={Inbox} label="Read Messages" />
            </div>
          </DashboardPanel>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <DashboardPanel title="Order Status">
            <BreakdownList items={dashboardData.statusBreakdown} emptyText="No order status data yet." />
          </DashboardPanel>

          <DashboardPanel title="Payment Queue">
            <BreakdownList items={dashboardData.paymentBreakdown} emptyText="No payment data yet." />
          </DashboardPanel>

          <DashboardPanel title="Product Categories">
            <BreakdownList items={dashboardData.categoryBreakdown} emptyText="No product categories yet." />
          </DashboardPanel>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <DashboardPanel
            title="Low Stock Watch"
            action={<ActionLink href="/admin/products" icon={Package} label="Open Products" />}
          >
            {dashboardData.lowStockList.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-success-soft p-4 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold">All active products have healthy stock.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.lowStockList.map((product) => (
                  <div key={product.id} className="flex min-w-0 flex-col items-start gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{product.name}</p>
                      <p className="text-sm font-semibold text-muted">
                        {[product.brand, product.category].filter(Boolean).join(" · ") || "No category"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-destructive-soft px-3 py-1 text-sm font-semibold text-destructive">
                      {product.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel title="Operational Flags">
            <div className="grid gap-3">
              <OperationalFlag
                href="/admin/orders?payment=Verifying"
                icon={CreditCard}
                title="Verify Payments"
                detail="Check uploaded payment proof"
                value={dashboardData.stats.verifyingPayments}
                tone={dashboardData.stats.verifyingPayments > 0 ? "warning" : "neutral"}
              />
              <OperationalFlag
                href="/admin/orders?payment=Unpaid"
                icon={DollarSign}
                title="Collect Payments"
                detail="Follow up unpaid orders"
                value={dashboardData.stats.unpaidOrders}
                tone={dashboardData.stats.unpaidOrders > 0 ? "warning" : "neutral"}
              />
              <OperationalFlag
                href="/admin/orders?status=Pending"
                icon={Clock}
                title="Confirm Orders"
                detail="New orders waiting for admin action"
                value={dashboardData.stats.pendingOrders}
                tone={dashboardData.stats.pendingOrders > 0 ? "warning" : "neutral"}
              />
              <OperationalFlag
                href="/admin/orders?status=Processing"
                icon={Package}
                title="Pack And Dispatch"
                detail="Orders currently being prepared"
                value={dashboardData.stats.processingOrders}
              />
              <OperationalFlag
                href="/admin/products"
                icon={AlertTriangle}
                title="Restock Products"
                detail="Active products with 5 or fewer left"
                value={dashboardData.stats.lowStockProducts}
                tone={dashboardData.stats.lowStockProducts > 0 ? "danger" : "neutral"}
              />
              <OperationalFlag
                href="/admin/messages"
                icon={Inbox}
                title="Reply To Customers"
                detail="Unread contact messages"
                value={dashboardData.stats.unreadMessages}
                tone={dashboardData.stats.unreadMessages > 0 ? "warning" : "neutral"}
              />
            </div>
          </DashboardPanel>
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <PageErrorBoundary context="admin-dashboard">
      <AdminDashboardContent />
    </PageErrorBoundary>
  );
}
