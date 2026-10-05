import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { readJson, InputError } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiAuth(request);
    const { testimonialId } = await readJson(request, "testimonialDelete");
    const ref = adminDb.collection("testimonials").doc(testimonialId);
    await adminDb.runTransaction(async tx => {
      if (!(await tx.get(ref)).exists) throw new InputError("Testimonial not found.", 404);
      tx.delete(ref);
      tx.create(adminDb.collection("audit_logs").doc(), { actor: actor.uid, action: "testimonial.delete", resource_id: testimonialId, created_at: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ deleted: true });
  } catch (error) { return securityError(error); }
}
