import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";

export const SESSION_COOKIE_NAME = "firebase-session";
export const SESSION_EXPIRES_IN = 24 * 60 * 60 * 1000;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Reject login/logout CSRF and cookie-authenticated writes. Vercel supplies
// the public Host even when the internal request URL differs.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    const allowed = new Set(["https://www.goshperfumestudio.com", "https://goshperfumestudio.com",
      ...(process.env.SECURITY_ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean)]);
    if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
    const development = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname);
    return source.origin === origin && source.host === host && (allowed.has(origin) || development) &&
      source.protocol === (process.env.NODE_ENV === "production" ? "https:" : target.protocol);
  } catch { return false; }
}

export function readSessionCookie(request: Request): string | null {
  try {
    const part = request.headers.get("cookie")?.split(";")
      .find((value) => value.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return part ? decodeURIComponent(part.trim().slice(SESSION_COOKIE_NAME.length + 1)) : null;
  } catch { return null; }
}

export async function canAccessProtectedPages(user: DecodedIdToken): Promise<boolean> {
  const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
  const current = await adminAuth.getUser(user.uid);
  if (current.disabled) return false;
  if (current.emailVerified === true) return true;
  // Preserve existing administrators; the exception is derived server-side.
  return (await adminDb.collection("users").doc(user.uid).get()).data()?.role === "admin";
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const user = await adminAuth.verifySessionCookie(token, true);
    const current = await adminAuth.getUser(user.uid);
    return current.disabled ? null : user;
  } catch { return null; }
}

export async function requireAuth(returnTo = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  if (!(await canAccessProtectedPages(user))) redirect(`/verify-email?redirect=${encodeURIComponent(returnTo)}`);
  return user;
}
