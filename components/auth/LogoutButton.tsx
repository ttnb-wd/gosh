"use client";
import StudioErrorText from "@/components/ui/StudioErrorText";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { authButtonClass } from "./AuthShell";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <>
    <button className={authButtonClass} disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { await signOutUser(); router.replace("/login"); router.refresh(); }
      catch { setError("Could not finish signing out. Please try again."); }
      finally { setBusy(false); }
    }}>{busy ? "Signing out..." : "Sign Out"}</button>
    {error && <p role="alert" className="text-sm text-destructive"><StudioErrorText message={error} /></p>}
  </>;
}
