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
 * browser. Returns the public ImageKit URL + fileId, which are stored in
 * Firestore (orders + payments).
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
     * In-memory limiting is best-effort on serverless, but consistent with the
     * rest of the codebase and a real defense against casual abuse.
     */
    const rateLimit = checkRateLimit({
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

    const formData = await request.formData();
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await imagekit.files.upload({
      file: buffer.toString("base64"),
      fileName: file.name,
      folder: "/gosh/payments",
      useUniqueFileName: true,
    });

    if (!uploadResult.fileId) {
      return NextResponse.json(
        { error: "Upload failed to return a file id." },
        { status: 500 }
      );
    }

    /*
     * Record upload ownership so DELETE /api/checkout/delete-payment-proof can
     * verify the caller uploaded this file. This prevents a malicious client
     * from guessing a fileId and deleting another user's payment proof (IDOR).
     * The collection is server-managed (Firebase Admin SDK) and denied to all
     * clients by the Firestore rules default-deny.
     */
    await adminDb.collection("payment_uploads").doc(uploadResult.fileId).set({
      user_id: user.uid,
      file_id: uploadResult.fileId,
      created_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      name: uploadResult.name,
    });
  } catch (error) {
    console.error("Payment proof upload error:", error);

    return NextResponse.json(
      { error: "Could not upload payment proof." },
      { status: 500 }
    );
  }
}