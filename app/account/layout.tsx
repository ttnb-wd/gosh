import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireAuth("/account");
  return children;
}
