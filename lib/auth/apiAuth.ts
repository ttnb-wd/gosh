/**
 * API Route Authentication Utilities
 * Firebase Authentication + Firebase Admin
 */

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { canAccessProtectedPages, isSameOrigin, readSessionCookie, SESSION_COOKIE_NAME } from "./session";


function getBearerToken(request: NextRequest | Request): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7).trim() || null;
}

/**
 * Get authenticated Firebase user from either a Bearer ID token or the
 * httpOnly "firebase-session" cookie.
 *
 * The admin dashboard client calls use `fetch(..., { credentials: "include" })`
 * which sends the session cookie on the same origin (no manual Bearer header).
 * Both are verified server-side with the Firebase Admin SDK.
 */
export async function getAuthenticatedUser(
  request: NextRequest | Request
) {
  const bearerToken = getBearerToken(request);
  const sessionToken = readSessionCookie(request);

  const token = bearerToken || sessionToken;

  if (!token) {
    return null;
  }

  try {
    // Prefer ID-token verification (tokens from the client SDK).
    // checkRevoked=true rejects tokens after the user's refresh tokens were
    // revoked (e.g. after logout), so a revoked session cannot authenticate.
    if (bearerToken) {
      const user = await adminAuth.verifyIdToken(bearerToken, true);
      return await canAccessProtectedPages(user) ? user : null;
    }

    // Fall back to the httpOnly session cookie created by POST /api/auth/session.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) return null;
    const user = await adminAuth.verifySessionCookie(sessionToken!, true);
    return await canAccessProtectedPages(user) ? user : null;
  } catch {

    return null;
  }
}
/**
 * Check if authenticated Firebase user is admin
 */
export async function checkAdminApiAuth(
  request: NextRequest | Request
) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      isAdmin: false,
      user: null,
    };
  }

  try {
    const profileSnapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .get();

    if (!profileSnapshot.exists) {
      return {
        isAdmin: false,
        user,
      };
    }

    const profile = profileSnapshot.data();

    const isAdmin = profile?.role === "admin";

    return {
      isAdmin,
      user,
      profile,
    };
  } catch {


    return {
      isAdmin: false,
      user,
    };
  }
}

/**
 * Require admin authentication for API route
 */
export async function requireAdminApiAuth(
  request: NextRequest | Request
) {
  const { isAdmin, user } =
    await checkAdminApiAuth(request);

  if (!isAdmin || !user) {
    throw new Error("Admin access required");
  }

  return user;
}

export { SESSION_COOKIE_NAME };
