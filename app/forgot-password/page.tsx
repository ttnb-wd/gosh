"use client";

import { useState } from "react";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { validateEmail } from "@/lib/validation";
import AuthShell, { authButtonClass, authInputClass } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setError("");
    const validation = validateEmail(email);
    if (!validation.isValid) { setError(validation.error || "Please enter a valid email address."); return; }
    setBusy(true);
    try {
      const result = await fetch("/api/auth/password-reset", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }),
      });
      if (!result.ok) {
        setError(getAuthErrorMessage(result.status === 429 ? { code: "auth/too-many-requests" } : null));
        return;
      }
      setSent(true);
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Forgot Password">
    {sent ? <p role="status">If an account exists for this email, we’ve sent password reset instructions. Please check your inbox and spam folder.</p> :
      <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-5">
        <label htmlFor="reset-email" className="block text-sm font-bold">Email</label>
        <input id="reset-email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!error} aria-describedby={error ? "reset-email-error" : undefined} className={authInputClass} value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && <p id="reset-email-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={authButtonClass}>{busy ? "Sending..." : "Send reset link"}</button>
      </form>}
    <Link href="/login" className="block text-sm text-yellow-700">Back to login</Link>
  </AuthShell>;
}
