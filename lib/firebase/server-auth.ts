import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./admin";

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

  return adminAuth.verifyIdToken(token);
}
