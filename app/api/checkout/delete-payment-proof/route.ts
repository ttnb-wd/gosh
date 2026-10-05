import { readJson, InputError } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { deleteImageKitFile } from "@/lib/imagekit";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST /api/checkout/delete-payment-proof
 *
 * Best-effort cleanup of an uploaded ImageKit payment proof (e.g. when an
 * order fails and must be re-submitted).
 *
 * Security: the fileId is verified to belong to the authenticated caller before
 * the ImageKit file is deleted. This prevents a malicious client from guessing
 * a fileId and deleting another user's payment proof (IDOR). Ownership is
 * recorded server-side in payment_uploads/{fileId} at upload time.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    let body: { fileId?: string };

    try {
      body = (await readJson(request, "file")) as { fileId?: string };
    } catch (error) { return securityError(error); }

    const fileId =
      typeof body.fileId === "string" && body.fileId.trim()
        ? body.fileId.trim()
        : null;

    if (!fileId) {
      return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    }

    /*
     * Ownership check: the caller may only delete a file that they uploaded
     * (tracked in payment_uploads/{fileId} by the upload route).
     */
    const ref = adminDb.collection("payment_uploads").doc(fileId);
    await adminDb.runTransaction(async tx => {
      const tracking = await tx.get(ref);
      if (!tracking.exists || tracking.data()?.user_id !== user.uid) throw new InputError("Payment proof not found.", 404);
      if (tracking.data()?.order_id || tracking.data()?.deleting) throw new InputError("Payment proof is in use.", 409);
      tx.update(ref, { deleting: true });
    });
    try { await deleteImageKitFile(fileId, "receipt"); }
    catch (error) { await ref.update({ deleting: false }); throw error; }

    // Remove the temporary ownership record now that the file is gone.
    await adminDb
      .collection("payment_uploads")
      .doc(fileId)
      .delete()
      .catch(() => {
        // Non-critical cleanup.
      });

    return NextResponse.json({ success: true });
  } catch (error) { return securityError(error); }
}
