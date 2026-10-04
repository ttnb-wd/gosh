"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { confirmPasswordReset, verifyPasswordResetCode, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { validatePassword } from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import AuthShell, { authButtonClass, authInputClass } from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const code = useSearchParams().get("oobCode");
  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    setValid(false); setChecking(true);
    if (!code) { setError("This reset link is missing or invalid. Please request a new link."); setChecking(false); return; }
    verifyPasswordResetCode(auth, code).then(() => { if (active) setValid(true); })
      .catch((error) => { if (active) setError(getAuthErrorMessage(error)); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [code]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy || !valid || !code) return;
    const validation = validatePassword(password);
    setError("");
    if (!validation.isValid) { setError(validation.error || "Please choose a stronger password."); return; }
    if (password !== confirm) { setError("Passwords must match."); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(auth, code, password);
      // Reset invalidates prior Firebase credentials. Clear this browser's stale
      // state without requiring a valid session or assuming the same account.
      setDone(true); setPassword(""); setConfirm("");
      try {
        const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        if (!response.ok) throw new Error("Logout failed");
        await signOut(auth);
        window.dispatchEvent(new Event("gosh-auth-changed"));
      } catch {
        setError("Your password was reset, but this browser could not finish signing out. Please sign in again.");
      }
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <AuthShell title={done ? "Password reset" : "Reset Password"}>
    {checking ? <p role="status">Checking your reset link...</p> : done ? <p role="status">Your password has been reset. Please sign in with your new password.</p> : valid ?
      <form className="space-y-5" onSubmit={submit}>
        <label htmlFor="new-password" className="block text-sm font-bold">New Password</label>
        <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={authInputClass} value={password} onChange={(event) => setPassword(event.target.value)} />
        <p className="text-xs">At least 8 characters with letters and numbers.</p>
        <label htmlFor="confirm-password" className="block text-sm font-bold">Confirm Password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required className={authInputClass} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <button disabled={busy} className={authButtonClass}>{busy ? "Updating..." : "Reset password"}</button>
      </form> : null}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!valid && !checking && <Link href="/forgot-password" className="block text-sm text-yellow-700">Request a new reset link</Link>}
    <Link href="/login" className="block text-sm text-yellow-700">Back to login</Link>
  </AuthShell>;
}
export default function ResetPasswordPage() {
  return <Suspense fallback={<AuthShell title="Reset Password"><p>Loading...</p></AuthShell>}><ResetPasswordForm /></Suspense>;
}
