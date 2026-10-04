import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  await requireAuth("/orders");
  return children;
}
