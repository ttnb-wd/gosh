"use client";

import StudioErrorText from "@/components/ui/StudioErrorText";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { applyActionCode, checkActionCode, ActionCodeOperation } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { completeEmailVerification, sendVerificationEmail, signOutUser } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getVerificationDestination } from "@/lib/auth/config";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthShell, { authButtonClass } from "@/components/auth/AuthShell";

function VerificationForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { status, user } = useAuth();
  const code = params.get("oobCode");
  const destination = getVerificationDestination(params.get("redirect"), params.get("continueUrl"));
  const signInUrl = `/login?verified=1&redirect=${encodeURIComponent(destination)}`;
  const requestInProgress = useRef(false);
  const actionApplied = useRef(false);
  const actionEmail = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("delivery") === "failed" ? "Your account is ready, but we couldn't finish sending your email. Please try again below." : "");
  const [message, setMessage] = useState(params.get("sent") === "1" ? "We've sent a verification link to your email address. Check your inbox and spam folder." : "");
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(params.get("sent") === "1" ? 60 : 0);
  useEffect(() => { actionApplied.current = false; actionEmail.current = null; setVerified(false); }, [code]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function check() {
    if (requestInProgress.current) return;
    requestInProgress.current = true; setBusy(true); setError("");
    try {
      if (code && !actionApplied.current) {
        const action = await checkActionCode(auth, code);
        if (action.operation !== ActionCodeOperation.VERIFY_EMAIL) {
          throw Object.assign(new Error("Invalid verification link"), { code: "auth/invalid-action-code" });
        }
        actionEmail.current = action.data.email ?? null;
        await applyActionCode(auth, code);
        actionApplied.current = true;
      }
      const current = auth.currentUser;
      if (!current || (actionEmail.current && current.email?.toLowerCase() !== actionEmail.current.toLowerCase())) {
        if (current) await signOutUser();
        if (code) { setVerified(true); setMessage("Your email is verified. Sign in to continue to your account."); }
        else setError("Sign in to check your email verification.");
        return;
      }
      if (!(await completeEmailVerification(current))) {
        setMessage("Your email isn't verified yet. Open the link in your inbox, then try again.");
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch (error) {
      if ((error as { code?: string }).code === "auth/requires-recent-login") {
        router.replace(signInUrl);
      } else setError(getAuthErrorMessage(error));
    } finally { requestInProgress.current = false; setBusy(false); }
  }

  async function resend() {
    if (cooldown || requestInProgress.current) return;
    requestInProgress.current = true; setBusy(true); setError("");
    try {
      const current = auth.currentUser;
      if (!current) { setError("Sign in to resend your verification email."); return; }
      // This helper reloads the user and avoids sending to already verified accounts.
      const sent = await sendVerificationEmail(current, destination);
      if (!sent) { await completeEmailVerification(current); router.replace(destination); router.refresh(); return; }
      setCooldown(60);
      setMessage("We've sent another verification link. Check your inbox and spam folder.");
    } catch (error) {
      if ((error as { code?: string }).code === "auth/requires-recent-login") router.replace(signInUrl);
      else setError(getAuthErrorMessage(error));
    } finally { requestInProgress.current = false; setBusy(false); }
  }

  async function changeAccount() {
    if (requestInProgress.current) return;
    requestInProgress.current = true; setBusy(true); setError("");
    try {
      await signOutUser();
      router.replace(`/login?mode=signup&redirect=${encodeURIComponent(destination)}`);
      router.refresh();
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { requestInProgress.current = false; setBusy(false); }
  }

  return <AuthShell title={verified ? "Email verified" : "Check your email"}>
    {status === "loading" ? <p role="status">Getting your account ready...</p> : <>
      <p className="text-sm">{verified ? "You're one step closer to discovering your next fragrance." : "Verify your email to enjoy your Gosh account."}
        {user?.email && <span className="mt-2 block break-all font-semibold">{user.email}</span>}
      </p>
      {!user && !code && <p className="text-sm">Sign in to resend your verification email or check its status.</p>}
      {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive"><StudioErrorText message={error} /></p>}
      {!verified && <>
        <button className={authButtonClass} disabled={busy || (!user && !code)} onClick={check}>{busy ? "Please wait..." : code ? "Verify email" : "I've verified my email"}</button>
        {user && <button className={authButtonClass} disabled={busy || cooldown > 0} onClick={resend}>{cooldown ? `Resend in ${cooldown}s` : "Resend verification email"}</button>}
      </>}
      {user && <button type="button" disabled={busy} onClick={changeAccount} className="block w-full rounded-lg py-2 text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-yellow-500 disabled:opacity-60">Change email / Sign out</button>}
      <Link href={verified ? signInUrl : `/login?redirect=${encodeURIComponent(destination)}`} className="block text-sm text-accent">{verified ? "Continue to Sign In" : "Back to Sign In"}</Link>
    </>}
  </AuthShell>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<AuthShell title="Check your email"><p role="status">Loading...</p></AuthShell>}><VerificationForm /></Suspense>;
}
