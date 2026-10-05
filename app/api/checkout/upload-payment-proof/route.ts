import { validatedImage, readUpload } from "@/lib/security/uploads";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { checkRateLimit, createRateLimitId } from "@/lib/rateLimit";
import imagekit from "@/lib/imagekit";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST /api/checkout/upload-payment-proof
 *
 * Authenticated customers upload a payment receipt image. The file is sent to
 * ImageKit on the SERVER so the ImageKit private key is never exposed to the
 * browser.
 *
 * SECURITY:
 *  - Files are uploaded to the `/gosh/payment-proofs` folder and marked PRIVATE
 *    with `isPrivateFile: true`. Private files are only accessible via a signed
 *    ImageKit URL, which is generated server-side (see lib/imagekit.ts) and only
 *    used as the upstream fetch target inside the authenticated proxy route.
 *    Existing files under the legacy `/gosh/payments` folder remain accessible
 *    only through the authenticated proxy route (see /api/checkout/payment-proof).
 *  - The public ImageKit URL is NOT returned to the client. Only the `fileId` is
 *    returned; the receipt is served later through the authenticated, authorized
 *    proxy route so the raw CDN URL is never exposed to the browser.
 *  - Ownership is recorded server-side in `payment_uploads/{fileId}` so both the
 *    proxy route and delete-payment-proof can verify the caller owns the file.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please login or create an account to place your order." },
        { status: 401 }
      );
    }

    /*
     * Rate limit per user to limit abuse (image spam / ImageKit storage DoS).
     */
    const rateLimit = await checkRateLimit({
      identifier: createRateLimitId(user.uid, "payment-upload"),
      maxRequests: 10,
      windowSeconds: 600, // 10 per 10 minutes
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await readUpload(request);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed for payment proof." },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Payment proof image must be 10MB or less." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Payment proof image is empty." },
        { status: 400 }
      );
    }

    const { buffer, fileName } = await validatedImage(file);

    const uploadResult = await imagekit.files.upload({
      file: buffer.toString("base64"),
      fileName,
      folder: "/gosh/payment-proofs",
      useUniqueFileName: true,
      isPrivateFile: true,
    });

    if (!uploadResult.fileId) {
      return NextResponse.json(
        { error: "Upload failed to return a file id." },
        { status: 500 }
      );
    }

    /*
     * Record upload ownership so the authenticated proxy route and
     * DELETE /api/checkout/delete-payment-proof can verify the caller uploaded
     * this file. This prevents a malicious client from guessing a fileId and
     * accessing or deleting another user's payment proof (IDOR). The collection
     * is server-managed (Firebase Admin SDK) and denied to all clients by the
     * Firestore rules default-deny.
     */
    await adminDb.collection("payment_uploads").doc(uploadResult.fileId).set({
      user_id: user.uid,
      file_id: uploadResult.fileId,
      created_at: FieldValue.serverTimestamp(),
    });

    /*
     * Return ONLY the fileId — never the public ImageKit URL. The receipt is
     * served through the authenticated proxy route instead.
     */
    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      name: uploadResult.name,
    });
  } catch (error) { return securityError(error, "Could not upload payment proof."); }
}
