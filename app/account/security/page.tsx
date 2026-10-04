"use client";

import { useState } from "react";
import Link from "next/link";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { signOutUser } from "@/lib/firebase/auth";
import { validatePassword } from "@/lib/validation";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import AuthShell, { authButtonClass, authInputClass } from "@/components/auth/AuthShell";

export default function AccountSecurityPage() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setError("");
    const user = auth.currentUser;
    if (!user?.email) { setError("Please sign in again to change your password."); return; }
    const validation = validatePassword(password);
    if (!validation.isValid) { setError(validation.error || "Please choose a stronger password."); return; }
    if (password !== confirm) { setError("Passwords must match."); return; }
    if (password === current) { setError("Choose a password different from your current password."); return; }
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, password);
      setDone(true); setCurrent(""); setPassword(""); setConfirm("");
      try { await signOutUser(); } catch { setError("Password updated, but logout could not finish. Please sign in again."); }
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Change Password">
    {done ? <p role="status">Password updated successfully. Please sign in again with your new password.</p> :
      <form onSubmit={submit} className="space-y-5">
        <label htmlFor="current-password" className="block text-sm font-bold">Current Password</label>
        <input id="current-password" type="password" autoComplete="current-password" required className={authInputClass} value={current} onChange={(event) => setCurrent(event.target.value)} />
        <label htmlFor="new-password" className="block text-sm font-bold">New Password</label>
        <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className={authInputClass} value={password} onChange={(event) => setPassword(event.target.value)} />
        <p className="text-xs">At least 8 characters with letters and numbers.</p>
        <label htmlFor="confirm-new-password" className="block text-sm font-bold">Confirm New Password</label>
        <input id="confirm-new-password" type="password" autoComplete="new-password" required className={authInputClass} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <button className={authButtonClass} disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
      </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Link href="/login?redirect=%2Faccount%2Fsecurity" className="block text-sm text-yellow-700">Sign in again</Link>
    <Link href="/account" className="block text-sm text-yellow-700">Back to account</Link>
  </AuthShell>;
}
