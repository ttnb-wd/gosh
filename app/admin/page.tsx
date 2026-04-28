"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import StatCard from "@/components/admin/StatCard";
import { ShoppingBag, Clock, DollarSign, Package } from "lucide-react";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    try {
      // Load orders
      const savedOrders = localStorage.getItem("gosh_orders");
      const orders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];

      // Load products
      const savedProducts = localStorage.getItem("gosh_products");
      const products = savedProducts ? JSON.parse(savedProducts) : [];

      // Calculate stats
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((order) => order.status === "Pending").length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const totalProducts = products.length;

      setStats({
        totalOrders,
        pendingOrders,
        totalRevenue,
        totalProducts,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminHeader title="Dashboard" subtitle="Welcome to GOSH Perfume Admin" />

      <main className="p-6">
        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingBag}
            trend="+12% from last month"
            trendUp={true}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
          />
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            trend="+8% from last month"
            trendUp={true}
          />
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Package}
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-black">Recent Activity</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your dashboard overview. Navigate to Orders or Products to manage your store.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
