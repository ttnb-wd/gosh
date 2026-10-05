import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
export async function recordAdminChange(actor: string, action: string, resourceId: string) {
  // No request body, customer details, tokens, URLs or provider errors.
  try { await adminDb.collection("audit_logs").add({ actor, action, resource_id: resourceId, created_at: FieldValue.serverTimestamp() }); }
  catch { console.error("Administrative audit record could not be saved."); }
}
