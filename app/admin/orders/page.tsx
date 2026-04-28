"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import OrdersTable from "@/components/admin/OrdersTable";

export default function AdminOrdersPage() {
  return (
    <div className="min-h-screen">
      <AdminHeader title="Orders" subtitle="Manage customer orders" />

      <main className="p-6">
        <OrdersTable />
      </main>
    </div>
  );
}
