"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { createSupabaseClient } from "@/lib/supabase/client";
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
    <section className="min-w-0 rounded-2xl border border-[#d4af37]/20 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black leading-none text-[#1f1a14]">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function BreakdownList({ items, emptyText }: { items: BreakdownItem[]; emptyText: string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <p className="text-sm font-semibold text-[#7a6a55]">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 6).map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold text-[#7a6a55]">{item.label}</span>
            <span className="font-black text-[#1f1a14]">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#fff7e6]">
            <div
              className="h-full rounded-full bg-[linear-gradient(135deg,#d4af37,#f7d774)]"
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
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#d4af37]/25 bg-white px-4 py-2 text-sm font-black text-[#1f1a14] transition hover:border-[#d4af37] hover:bg-[#fff7e6]"
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
    neutral: "border-[#d4af37]/15 bg-white hover:border-[#d4af37]/35 hover:bg-[#fff8df] hover:shadow-[0_14px_35px_rgba(212,175,55,0.12)] dark:border-[#d4af37]/20 dark:bg-[#080704] dark:text-[#f8f1d8] dark:hover:border-[#d4af37]/45 dark:hover:bg-[#0d0b07] dark:hover:shadow-[0_16px_40px_rgba(212,175,55,0.16)]",
    warning: "border-[#d4af37]/30 bg-[#fff7e6]/70 hover:border-[#d4af37] hover:bg-[#fff8df] hover:shadow-[0_14px_35px_rgba(212,175,55,0.12)] dark:border-[#d4af37]/45 dark:bg-[#0d0b07] dark:text-[#f8f1d8] dark:shadow-[0_16px_40px_rgba(212,175,55,0.14)] dark:hover:border-[#d4af37]/45 dark:hover:bg-[#0d0b07] dark:hover:shadow-[0_16px_40px_rgba(212,175,55,0.16)]",
    danger: "border-red-200 bg-red-50/40 hover:border-red-300 dark:border-red-400/35 dark:bg-[#120807] dark:text-[#f8f1d8] dark:hover:border-red-300/50 dark:hover:bg-[#180b09] dark:hover:shadow-[0_16px_40px_rgba(248,113,113,0.14)]",
  };

  const iconStyles = {
    neutral: "bg-[#fff7e6] text-[#7a6a55] group-hover:bg-[#fff7d6] dark:border dark:border-[#d4af37]/20 dark:bg-[#151207] dark:text-[#d4af37] dark:group-hover:bg-[#1b1609]",
    warning: "bg-[#f7e7b3] text-[#6f1d1b] group-hover:bg-[#fff7d6] dark:border dark:border-[#d4af37]/20 dark:bg-[#151207] dark:text-[#d4af37] dark:group-hover:bg-[#1b1609]",
    danger: "bg-red-100 text-red-700 dark:border dark:border-red-400/25 dark:bg-[#26100e] dark:text-red-300 dark:group-hover:bg-[#30120f]",
  };
  const highlightIcon = title === "Verify Payments" || title === "Confirm Orders";

  return (
    <Link
      href={href}
      className={`admin-operational-flag admin-operational-flag-${tone} group flex min-w-0 flex-col items-start gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between ${styles[tone]}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`admin-operational-flag-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyles[tone]}`}>
          <Icon className={`h-5 w-5 ${highlightIcon ? "admin-operational-flag-highlight-icon" : ""}`} strokeWidth={highlightIcon ? 2.75 : 2} />
        </div>
        <div className="min-w-0">
          <p className="admin-operational-flag-title font-black text-[#1f1a14]">{title}</p>
          <p className="admin-operational-flag-detail mt-1 text-xs font-semibold leading-snug text-[#7a6a55] sm:truncate">{detail}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <span className="admin-operational-flag-value text-xl font-black text-[#1f1a14] transition group-hover:text-[#8a6a18] dark:text-[#f8f1d8] dark:group-hover:text-[#d4af37]">{value}</span>
        <ArrowRight className="admin-operational-flag-arrow h-4 w-4 text-[#7a6a55] transition group-hover:translate-x-1 group-hover:text-[#8a6a18] dark:text-[#f8f1d8] dark:group-hover:text-[#d4af37]" />
      </div>
    </Link>
  );
}

function AdminDashboardContent() {
  const { user, loading: authLoading } = useAdminAuth();
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
    if (!user) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [authLoading, user]);

  const loadDashboard = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const todayStart = getStartOfToday().toISOString();
      const [
        totalOrdersResult,
        todayOrdersResult,
        paidOrdersResult,
        totalProductsResult,
        activeProductsResult,
        lowStockCountResult,
        lowStockListResult,
        productCategoriesResult,
        customersResult,
        messagesResult,
        ...breakdownResults
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("orders").select("total").eq("payment_status", "Paid"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .lte("stock", 5),
        supabase
          .from("products")
          .select("id, name, brand, category, stock, is_active")
          .eq("is_active", true)
          .lte("stock", 5)
          .order("stock", { ascending: true })
          .limit(6),
        supabase.from("products").select("category"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "unread"),
        ...orderStatuses.map((status) =>
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status)
        ),
        ...paymentStatuses.map((status) =>
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", status)
        ),
      ]);

      const requiredResults = [
        totalOrdersResult,
        todayOrdersResult,
        paidOrdersResult,
        totalProductsResult,
        activeProductsResult,
        lowStockCountResult,
        lowStockListResult,
        productCategoriesResult,
        customersResult,
        ...breakdownResults,
      ];

      const firstError = requiredResults.find((result) => result.error)?.error;
      if (firstError) throw firstError;
      if (customersResult.error) throw customersResult.error;

      if (messagesResult.error) {
        console.error("Unread messages count error:", messagesResult.error);
      }

      const paidOrders = (paidOrdersResult.data || []) as { total: number | string | null }[];
      const lowStockList = (lowStockListResult.data || []) as Product[];
      const productCategories = (productCategoriesResult.data || []) as { category: string | null }[];
      const statusResults = breakdownResults.slice(0, orderStatuses.length);
      const paymentResults = breakdownResults.slice(orderStatuses.length);
      const statusBreakdown = orderStatuses
        .map((status, index) => ({ label: status, value: statusResults[index]?.count || 0 }))
        .filter((item) => item.value > 0);
      const paymentBreakdown = paymentStatuses
        .map((status, index) => ({ label: status, value: paymentResults[index]?.count || 0 }))
        .filter((item) => item.value > 0);

      setDashboardData({
        stats: {
          totalOrders: totalOrdersResult.count || 0,
          pendingOrders: statusBreakdown.find((item) => item.label === "Pending")?.value || 0,
          processingOrders: statusBreakdown.find((item) => item.label === "Processing")?.value || 0,
          deliveredOrders: statusBreakdown.find((item) => item.label === "Delivered")?.value || 0,
          cancelledOrders: statusBreakdown.find((item) => item.label === "Cancelled")?.value || 0,
          todayOrders: todayOrdersResult.count || 0,
          totalRevenue: paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
          unpaidOrders: paymentBreakdown.find((item) => item.label === "Unpaid")?.value || 0,
          verifyingPayments: paymentBreakdown.find((item) => item.label === "Verifying")?.value || 0,
          totalProducts: totalProductsResult.count || 0,
          activeProducts: activeProductsResult.count || 0,
          lowStockProducts: lowStockCountResult.count || 0,
          totalCustomers: customersResult.count || 0,
          unreadMessages: messagesResult.error ? 0 : messagesResult.count || 0,
        },
        lowStockList,
        categoryBreakdown: toBreakdown(productCategories, (product) => product.category),
        paymentBreakdown,
        statusBreakdown,
      });
    } catch (loadError) {
      console.error("Error loading dashboard:", loadError);
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

      <main role="main" className="overflow-hidden p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#d4af37]/20 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6f1d1b]">Live Summary</p>
            <h2 className="mt-1 text-xl font-black text-[#1f1a14]">Today&apos;s Store Snapshot</h2>
            <p className="mt-1 text-sm text-[#7a6a55]">
              Orders, payment work, product health, customers, and inbox items from Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/45 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-5 py-3 text-sm font-black text-[#1f1a14] shadow-[0_12px_30px_rgba(212,175,55,0.20)] transition hover:bg-[linear-gradient(135deg,#c99a1e,#f3d98b)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Dashboard
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Revenue Collected" value={formatMoney(dashboardData.stats.totalRevenue)} icon={DollarSign} trend={`${formatMoney(averageOrderValue)} avg order`} trendUp />
          <StatCard title="Orders Today" value={dashboardData.stats.todayOrders} icon={ShoppingBag} trend={`${dashboardData.stats.pendingOrders} pending`} trendUp={dashboardData.stats.pendingOrders === 0} />
          <StatCard title="Payments To Check" value={dashboardData.stats.verifyingPayments + dashboardData.stats.unpaidOrders} icon={Clock} trend={`${dashboardData.stats.verifyingPayments} verifying`} trendUp={false} />
          <StatCard title="Unread Messages" value={dashboardData.stats.unreadMessages} icon={Inbox} trend="From contact form" trendUp={dashboardData.stats.unreadMessages === 0} />
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Customers" value={dashboardData.stats.totalCustomers} icon={Users} />
          <StatCard title="Active Products" value={`${dashboardData.stats.activeProducts}/${dashboardData.stats.totalProducts}`} icon={Package} trend={`${activeProductRate}% active`} trendUp />
          <StatCard title="Low Stock Items" value={dashboardData.stats.lowStockProducts} icon={AlertTriangle} trend="5 or fewer left" trendUp={dashboardData.stats.lowStockProducts === 0} />
          <StatCard title="Fulfillment Rate" value={`${fulfillmentRate}%`} icon={CheckCircle2} trend={`${dashboardData.stats.deliveredOrders} delivered`} trendUp />
        </div>

        <div className="mt-6 grid gap-6">
          <DashboardPanel
            title="Quick Actions"
            action={<BarChart3 className="h-5 w-5 text-[#d4af37]" />}
          >
            <div className="grid gap-3">
              <ActionLink href="/admin/orders" icon={ShoppingBag} label="Manage Orders" />
              <ActionLink href="/admin/products" icon={Package} label="Update Products" />
              <ActionLink href="/admin/customers" icon={Users} label="Review Customers" />
              <ActionLink href="/admin/messages" icon={Inbox} label="Read Messages" />
            </div>
          </DashboardPanel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <DashboardPanel
            title="Low Stock Watch"
            action={<ActionLink href="/admin/products" icon={Package} label="Open Products" />}
          >
            {dashboardData.lowStockList.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-black">All active products have healthy stock.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.lowStockList.map((product) => (
                  <div key={product.id} className="flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-[#d4af37]/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#1f1a14]">{product.name}</p>
                      <p className="text-sm font-semibold text-[#7a6a55]">
                        {[product.brand, product.category].filter(Boolean).join(" · ") || "No category"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">
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
