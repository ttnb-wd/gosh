import { limitRequest } from "@/lib/security/abuse";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME, SESSION_EXPIRES_IN, sessionCookieOptions,
  isSameOrigin, readSessionCookie, canAccessProtectedPages,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await limitRequest(request, "session", 30);
  if (limited) return limited;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  try {
    // Lazy import keeps configuration failures catchable as safe responses.
    const { adminAuth } = await import("@/lib/firebase/admin");
    const idToken = authorization.slice(7).trim();
    const user = await adminAuth.verifyIdToken(idToken, true);
    // Require a recent password login/reauthentication, not just token refresh.
    const age = Math.floor(Date.now() / 1000) - user.auth_time;
    if (!Number.isFinite(age) || age < -60 || age > 5 * 60) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    if (!(await canAccessProtectedPages(user))) {
      return NextResponse.json({ error: "Please verify your email before signing in.", code: "email-unverified" }, { status: 403 });
    }
    const session = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN });
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE_NAME, session, { ...sessionCookieOptions, maxAge: SESSION_EXPIRES_IN / 1000 });
    return response;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const invalid = ["auth/argument-error", "auth/id-token-expired", "auth/id-token-revoked", "auth/invalid-id-token", "auth/user-disabled", "auth/user-not-found"].includes(code || "");
    return NextResponse.json({ error: invalid ? "Please sign in again." : "Could not create secure session. Please try again." }, { status: invalid ? 401 : 503 });
  }
}

export async function GET(request: Request) {
  const token = readSessionCookie(request);
  try {
    if (!token) throw new Error("Missing session");
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
    const user = await adminAuth.verifySessionCookie(token, true);
    const current = await adminAuth.getUser(user.uid);
    if (current.disabled) throw new Error("Account unavailable");
    const profile = (await adminDb.collection("users").doc(user.uid).get()).data();
    const allowed = current.emailVerified === true || profile?.role === "admin";
    return NextResponse.json({
      status: allowed ? "authenticated" : "unverified",
      user: { uid: user.uid, email: current.email ?? null, emailVerified: current.emailVerified === true,
        full_name: typeof profile?.full_name === "string" ? profile.full_name : null, role: profile?.role === "admin" ? "admin" : profile?.role === "customer" ? "customer" : "user" },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ status: "unauthenticated", user: null }, {
      status: 401, headers: { "Cache-Control": "private, no-store" },
    });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const token = readSessionCookie(request);
  let revocationFailed = false;
  if (token) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      let uid: string | null = null;
      try { uid = (await adminAuth.verifySessionCookie(token, true)).uid; }
      catch (error) {
        const code = (error as { code?: string })?.code;
        const invalid = ["auth/argument-error", "auth/invalid-session-cookie", "auth/session-cookie-expired", "auth/session-cookie-revoked", "auth/user-disabled", "auth/user-not-found"].includes(code || "");
        // Expired/invalid sessions are safe to clear; network/config failures
        // must remain retryable rather than claiming revocation succeeded.
        if (!invalid) throw error;
      }
      if (uid) await adminAuth.revokeRefreshTokens(uid);
    } catch { revocationFailed = true; }
  }
  const response = NextResponse.json(
    revocationFailed ? { error: "Session revocation failed. Please try signing out again." } : { success: true },
    { status: revocationFailed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
  // Keep the cookie on revocation failure so logout can be retried.
  if (!revocationFailed) response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
