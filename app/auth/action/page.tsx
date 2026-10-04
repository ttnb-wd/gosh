import { redirect } from "next/navigation";
import { getVerificationDestination } from "@/lib/auth/config";

export default async function EmailActionPage({ searchParams }: {
  searchParams: Promise<{ mode?: string; oobCode?: string; continueUrl?: string }>;
}) {
  const { mode, oobCode, continueUrl } = await searchParams;
  const params = new URLSearchParams({ oobCode: oobCode || "" });
  if (mode === "resetPassword") redirect(`/reset-password?${params}`);
  if (mode === "verifyEmail") {
    params.set("redirect", getVerificationDestination(null, continueUrl || null));
    redirect(`/verify-email?${params}`);
  }
  redirect("/login");
}
