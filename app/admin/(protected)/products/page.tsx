"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import ProductManager from "@/components/admin/ProductManager";

export default function AdminProductsPage() {
  return (
    <div className="min-h-screen">
      <AdminHeader title="Products" subtitle="Manage your product inventory" />
      <main role="main" className="p-4 sm:p-6">
        <ProductManager />
      </main>
    </div>
  );
}
