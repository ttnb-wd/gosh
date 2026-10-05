import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { readJson, InputError } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
export async function POST(request: Request) {
  try {
    const actor = await requireAdminApiAuth(request);
    const { brandId } = await readJson(request, "brandDelete");
    const ref = adminDb.collection("brands").doc(brandId);
    const result = await adminDb.runTransaction(async tx => {
      const brand = await tx.get(ref);
      if (!brand.exists) throw new InputError("Brand not found.", 404);
      const products = await tx.get(adminDb.collection("products").where("brand_id", "==", brandId).limit(1));
      if (products.empty) tx.delete(ref);
      else tx.update(ref, { is_active: false, updated_at: FieldValue.serverTimestamp() });
      tx.create(adminDb.collection("audit_logs").doc(), { actor: actor.uid, action: products.empty ? "brand.delete" : "brand.deactivate", resource_id: brandId, created_at: FieldValue.serverTimestamp() });
      return { deleted: products.empty };
    });
    return NextResponse.json(result);
  } catch (error) { return securityError(error); }
}
