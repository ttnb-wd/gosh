import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isSameOrigin } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const authorization = request.headers.get("authorization");
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
    let uid: string;
    try {
      if (!authorization?.startsWith("Bearer ")) throw new Error("Missing token");
      uid = (await adminAuth.verifyIdToken(authorization.slice(7).trim(), true)).uid;
    } catch {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    // Read identity from Firebase Auth, never the request body or Firestore.
    const user = await adminAuth.getUser(uid);
    const ref = adminDb.collection("users").doc(uid);
    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      const identity = { email: user.email ?? null, emailVerified: user.emailVerified,
        updated_at: FieldValue.serverTimestamp() };
      if (existing.exists) {
        // Never overwrite an existing role or custom profile information.
        transaction.update(ref, identity);
      } else {
        transaction.create(ref, { ...identity, id: uid, full_name: user.displayName?.slice(0, 100) ?? null,
          role: "user", created_at: FieldValue.serverTimestamp() });
      }
    });
    const profile = (await ref.get()).data();
    return NextResponse.json({ profile: { id: uid, email: profile?.email, full_name: profile?.full_name, role: profile?.role } },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not save your account. Please try again." }, { status: 503 });
  }
}
