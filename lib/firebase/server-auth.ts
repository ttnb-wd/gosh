import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./admin";
import { canAccessProtectedPages } from "@/lib/auth/session";

export async function verifyFirebaseToken(
  authorizationHeader: string | null
): Promise<DecodedIdToken> {
  if (!authorizationHeader) {
    throw new Error("Missing authorization header");
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new Error("Missing Firebase ID token");
  }

  // checkRevoked=true rejects ID tokens after the user's refresh tokens were
  // revoked (e.g. after logout), so revoked tokens cannot authenticate.
  const user = await adminAuth.verifyIdToken(token, true);
  if (!(await canAccessProtectedPages(user))) throw new Error("Email verification required");
  return user;
}
