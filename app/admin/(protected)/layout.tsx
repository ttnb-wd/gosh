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
        className="min-h-screen bg-canvas text-ink"
      >
        <AdminSidebar />

        <div className="lg:ml-64">
          {children}
        </div>
      </div>
    </AdminAuthProvider>
  );
}
