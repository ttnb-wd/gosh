/**
 * API Route Authentication Utilities
 * Firebase Authentication + Firebase Admin
 */

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "firebase-session";

function getBearerToken(request: NextRequest | Request): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7).trim() || null;
}

function getSessionCookieToken(
  request: NextRequest | Request
): string | null {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
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
  const sessionToken = getSessionCookieToken(request);

  const token = bearerToken || sessionToken;

  if (!token) {
    return null;
  }

  try {
    // Prefer ID-token verification (tokens from the client SDK).
    if (bearerToken) {
      return await adminAuth.verifyIdToken(bearerToken);
    }

    // Fall back to the httpOnly session cookie created by POST /api/auth/session.
    return await adminAuth.verifySessionCookie(sessionToken!, true);
  } catch (error) {
    console.error("Firebase token verification failed:", error);
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
  } catch (error) {
    console.error(
      "Firebase admin profile check failed:",
      error
    );

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