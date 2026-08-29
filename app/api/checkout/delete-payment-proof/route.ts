import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { deleteImageKitFile } from "@/lib/imagekit";

export const runtime = "nodejs";

/**
 * POST /api/checkout/delete-payment-proof
 *
 * Best-effort cleanup of an uploaded ImageKit payment proof (e.g. when an
 * order fails and must be re-submitted).
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

    const body = (await request.json()) as { fileId?: string };

    if (!body.fileId) {
      return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    }

    await deleteImageKitFile(body.fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment proof delete error:", error);

    return NextResponse.json(
      { error: "Could not delete payment proof." },
      { status: 500 }
    );
  }
}