import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import imagekit from "@/lib/imagekit";

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await imagekit.files.upload({
      file: buffer.toString("base64"),
      fileName: file.name,
      folder: "/gosh/payments",
      useUniqueFileName: true,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      name: uploadResult.name,
    });
  } catch (error) {
    console.error("Payment proof upload error:", error);

    const message =
      error instanceof Error ? error.message : "Could not upload payment proof.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}