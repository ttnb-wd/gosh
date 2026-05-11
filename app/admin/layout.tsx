import { requireAdmin } from "@/lib/auth/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthProvider from "@/components/admin/AdminAuthProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Require admin authentication - redirects if not admin
  await requireAdmin();

  return (
    <AdminAuthProvider>
      <div className="admin-premium-type min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,#fffaf0_0%,#ffffff_52%,#fff7e6_100%)] text-[#1f1a14]">
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
