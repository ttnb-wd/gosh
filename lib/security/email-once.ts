import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
// Durable per-event lease prevents parallel/repeated email triggers. A failed
// provider call is retryable; delivery after a process crash is at-least-once.
export async function deliverOnce(key: string, send: () => Promise<{ ok: boolean; skipped?: boolean; error?: string }>) {
  const ref = adminDb.collection("email_deliveries").doc(createHash("sha256").update(key).digest("hex"));
  const claimed = await adminDb.runTransaction(async tx => {
    const previous = await tx.get(ref);
    if (previous.data()?.sent === true || Number(previous.data()?.lease_until) > Date.now()) return false;
    tx.set(ref, { sent: false, lease_until: Date.now() + 120_000 }); return true;
  });
  if (!claimed) return { ok: true, duplicate: true };
  try {
    const result = await send();
    if (result.ok && !result.skipped) await ref.update({ sent: true, lease_until: 0, updated_at: FieldValue.serverTimestamp() });
    else await ref.delete();
    return result;
  } catch (error) { await ref.delete(); throw error; }
}
