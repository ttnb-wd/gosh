import { requireAdmin } from "@/lib/auth/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminAuthProvider from "@/components/admin/AdminAuthProvider";

/*
 * Admin routes call cookies() / verify the firebase-session cookie server-side
 * in requireAdmin(). They must never be statically prerendered at build time
 * (Next.js throws DYNAMIC_SERVER_USAGE), so force dynamic rendering.
 */
export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <AdminAuthProvider>
      <div
        data-admin-theme
        className="admin-premium-type min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,#fffaf0_0%,#ffffff_52%,#fff7e6_100%)] text-[#1f1a14] dark:bg-[#0f0b07] dark:text-[#fff7e6]"
      >
        <AdminSidebar />

        <div className="lg:ml-64">
          {children}
        </div>
      </div>
    </AdminAuthProvider>
  );
}
