import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import AuthShell from "@/components/auth/AuthShell";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AccountPage() {
  const user = await requireAuth("/account");
  return <AuthShell title="Your Account">
    <p className="break-all text-sm">{user.email}</p>
    <Link href="/orders" className="block text-sm text-accent">Your orders</Link>
    <Link href="/account/security" className="block text-sm text-accent">Account security — change password</Link>
    <LogoutButton />
    <Link href="/" className="block text-sm text-accent">Back to GOSH</Link>
  </AuthShell>;
}
