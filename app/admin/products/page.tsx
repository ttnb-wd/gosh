"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import ProductManager from "@/components/admin/ProductManager";

export default function AdminProductsPage() {
  return (
    <div className="min-h-screen">
      <AdminHeader title="Products" subtitle="Manage your product inventory" />

      <main className="p-6">
        <ProductManager />
      </main>
    </div>
  );
}
