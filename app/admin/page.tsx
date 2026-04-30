"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { createSupabaseClient } from "@/lib/supabase/client";
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

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  payment_method: string;
  payment_status: string;
  status: string;
  total: number;
  created_at: string;
}

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
  recentOrders: Order[];
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

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  Processing: "bg-purple-50 text-purple-700 border-purple-200",
  Delivered: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

const formatMoney = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

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
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-black">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BreakdownList({ items, emptyText }: { items: BreakdownItem[]; emptyText: string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <p className="text-sm font-semibold text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 6).map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold text-zinc-700">{item.label}</span>
            <span className="font-black text-black">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-yellow-400"
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
      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-black transition hover:border-yellow-300 hover:bg-yellow-50"
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
    neutral: "border-zinc-100 hover:border-zinc-300",
    warning: "border-yellow-200 bg-yellow-50/40 hover:border-yellow-400",
    danger: "border-red-200 bg-red-50/40 hover:border-red-300",
  };

  const iconStyles = {
    neutral: "bg-zinc-100 text-zinc-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
  };

  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${styles[tone]}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-black">{title}</p>
          <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{detail}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xl font-black text-black">{value}</span>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-yellow-700" />
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: emptyStats,
    recentOrders: [],
    lowStockList: [],
    categoryBreakdown: [],
    paymentBreakdown: [],
    statusBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const [
        ordersResult,
        productsResult,
        customersResult,
        messagesResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, customer_name, payment_method, payment_status, status, total, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, brand, category, stock, is_active")
          .order("stock", { ascending: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "unread"),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;

      if (messagesResult.error) {
        console.error("Unread messages count error:", messagesResult.error);
      }

      const orders = (ordersResult.data || []) as Order[];
      const products = (productsResult.data || []) as Product[];
      const todayStart = getStartOfToday();
      const paidOrders = orders.filter((order) => order.payment_status === "Paid");
      const lowStockList = products.filter((product) => product.is_active && Number(product.stock || 0) <= 5);

      setDashboardData({
        stats: {
          totalOrders: orders.length,
          pendingOrders: orders.filter((order) => order.status === "Pending").length,
          processingOrders: orders.filter((order) => order.status === "Processing").length,
          deliveredOrders: orders.filter((order) => order.status === "Delivered").length,
          cancelledOrders: orders.filter((order) => order.status === "Cancelled").length,
          todayOrders: orders.filter((order) => new Date(order.created_at) >= todayStart).length,
          totalRevenue: paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
          unpaidOrders: orders.filter((order) => order.payment_status === "Unpaid").length,
          verifyingPayments: orders.filter((order) => order.payment_status === "Verifying").length,
          totalProducts: products.length,
          activeProducts: products.filter((product) => product.is_active).length,
          lowStockProducts: lowStockList.length,
          totalCustomers: customersResult.count || 0,
          unreadMessages: messagesResult.error ? 0 : messagesResult.count || 0,
        },
        recentOrders: orders.slice(0, 6),
        lowStockList: lowStockList.slice(0, 6),
        categoryBreakdown: toBreakdown(products, (product) => product.category),
        paymentBreakdown: toBreakdown(orders, (order) => order.payment_status),
        statusBreakdown: toBreakdown(orders, (order) => order.status),
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

      <main className="p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">Live Summary</p>
            <h2 className="mt-1 text-xl font-black text-black">Today&apos;s Store Snapshot</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Orders, payment work, product health, customers, and inbox items from Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <DashboardPanel
            title="Recent Orders"
            action={<ActionLink href="/admin/orders" icon={ShoppingBag} label="View Orders" />}
          >
            {dashboardData.recentOrders.length === 0 ? (
              <p className="text-sm font-semibold text-zinc-500">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
                      <th className="pb-3">Order</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {dashboardData.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-4">
                          <Link href={`/admin/orders?orderId=${order.id}`} className="font-black text-black hover:text-yellow-700">
                            {order.order_number}
                          </Link>
                          <p className="mt-1 text-xs font-semibold text-zinc-400">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 text-sm font-bold text-zinc-700">{order.customer_name}</td>
                        <td className="py-4">
                          <p className="text-sm font-bold text-zinc-700">{order.payment_method}</p>
                          <p className="text-xs font-semibold text-zinc-400">{order.payment_status}</p>
                        </td>
                        <td className="py-4">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[order.status] || "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 text-right text-sm font-black text-black">{formatMoney(Number(order.total || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Quick Actions"
            action={<BarChart3 className="h-5 w-5 text-yellow-600" />}
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
                  <div key={product.id} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-black text-black">{product.name}</p>
                      <p className="text-sm font-semibold text-zinc-500">
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
