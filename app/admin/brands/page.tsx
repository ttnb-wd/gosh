"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import BrandManager from "@/components/admin/BrandManager";

export default function AdminBrandsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader title="Brands" subtitle="Manage product brands and visibility" />
      <main role="main" className="p-6">
        <BrandManager />
      </main>
    </div>
  );
}
