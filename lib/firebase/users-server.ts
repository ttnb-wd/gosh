import "server-only";

import { adminDb } from "./admin";

export type FirebaseAdminUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "customer";
  created_at?: unknown;
  updated_at?: unknown;
};

export async function getUserProfileAdmin(
  uid: string
): Promise<FirebaseAdminUserProfile | null> {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<
      FirebaseAdminUserProfile,
      "id"
    >),
  };
}
