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
      body = (await request.json()) as { fileId?: string };
    } catch {
      return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    }

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
    const tracking = await adminDb
      .collection("payment_uploads")
      .doc(fileId)
      .get();

    const ownerId = tracking.exists
      ? ((tracking.data()?.user_id as string | undefined) ?? null)
      : null;

    if (!ownerId || ownerId !== user.uid) {
      return NextResponse.json(
        { error: "Not authorized to delete this file." },
        { status: 403 }
      );
    }

    await deleteImageKitFile(fileId);

    // Remove the temporary ownership record now that the file is gone.
    await adminDb
      .collection("payment_uploads")
      .doc(fileId)
      .delete()
      .catch(() => {
        // Non-critical cleanup.
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment proof delete error:", error);

    return NextResponse.json(
      { error: "Could not delete payment proof." },
      { status: 500 }
    );
  }
}