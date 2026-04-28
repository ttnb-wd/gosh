import { requireAdmin } from "@/lib/auth/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthProvider from "@/components/admin/AdminAuthProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Require admin authentication - redirects if not admin
  await requireAdmin();

  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-zinc-50">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content - responsive margin */}
        <div className="lg:ml-64">
          {children}
        </div>
      </div>
    </AdminAuthProvider>
  );
}
