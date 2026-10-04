import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  await requireAuth("/checkout");
  return children;
}
