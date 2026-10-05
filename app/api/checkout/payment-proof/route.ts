import { NextResponse } from "next/server";
import { checkAdminApiAuth } from "@/lib/auth/apiAuth";
import imagekit, { buildSignedImageKitUrl } from "@/lib/imagekit";
import { adminDb } from "@/lib/firebase/admin";
import { validId } from "@/lib/security/validation";
import { allowedReceiptUrl, imageTypes } from "@/lib/security/uploads";
import { limitRequest } from "@/lib/security/abuse";

export const runtime = "nodejs";

/**
 * GET /api/checkout/payment-proof?orderId=...&fileId=...
 *
 * SECURE proxy for payment receipts.
 *
 * Payment receipts are no longer exposed as raw public ImageKit URLs. This
 * route authenticates the caller and authorizes access BEFORE streaming the
 * image bytes back to the browser. The client never receives the underlying
 * ImageKit/CDN URL.
 *
 * Authorization:
 *  - Admin may access any receipt (payment verification workflow).
 *  - A customer may only access their OWN receipt, verified server-side against
 *    the order's `user_id` (preferred) or the `payment_uploads/{fileId}`
 *    ownership record (pre-order upload preview).
 *
 * IDOR protection:
 *  - When an `orderId` is supplied, the fileId is read from the order document
 *    server-side; a client-supplied `fileId` is NOT trusted for that path, so
 *    Customer A cannot request Customer B's proof by changing fileId/orderId.
 *  - When only a `fileId` is supplied (no order yet), access is granted only if
 *    `payment_uploads/{fileId}.user_id` matches the caller (or caller is admin).
 *
 * The upstream image is fetched server-side and streamed, so no raw URL is
 * leaked to the client.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim() || null;
    const fileIdParam = searchParams.get("fileId")?.trim() || null;

    if (!orderId && !fileIdParam) {
      return NextResponse.json(
        { error: "Missing order or file id." },
        { status: 400 }
      );
    }

    const auth = await checkAdminApiAuth(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const uid = auth.user.uid;
    const isAdmin = auth.isAdmin;
    if ((orderId && !validId(orderId)) || (fileIdParam && !validId(fileIdParam))) return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
    const limited = await limitRequest(request, "receipt", 60, 600, uid);
    if (limited) return limited;

    let fileId: string | null = null;
    let legacyUrl: string | null = null;

    // -------------------------------------------------------------------------
    // Order-based access (preferred). fileId is read from the order server-side.
    // -------------------------------------------------------------------------
    if (orderId) {
      if (orderId.length > 200) {
        return NextResponse.json(
          { error: "Invalid order id." },
          { status: 400 }
        );
      }

      const orderSnap = await adminDb.collection("orders").doc(orderId).get();

      if (!orderSnap.exists) {
        return NextResponse.json(
          { error: "Order not found." },
          { status: 404 }
        );
      }

      const orderData = orderSnap.data() as Record<string, unknown>;

      const ownerId = orderData.user_id as string | undefined;

      // Ownership check: only the order owner or an admin may view the receipt.
      if (!isAdmin && (!ownerId || ownerId !== uid)) {
        return NextResponse.json(
          { error: "Payment proof not found." },
          { status: 404 }
        );
      }

      fileId =
        typeof orderData.payment_screenshot_file_id === "string" &&
        orderData.payment_screenshot_file_id
          ? orderData.payment_screenshot_file_id
          : null;

      // Legacy compatibility: older orders may only have a stored public URL.
      legacyUrl =
        typeof orderData.payment_screenshot_url === "string" &&
        orderData.payment_screenshot_url
          ? orderData.payment_screenshot_url
          : null;
    } else {
      // -----------------------------------------------------------------------
      // fileId-only access (pre-order upload preview). Ownership via payment_uploads.
      // -----------------------------------------------------------------------
      if (!fileIdParam || fileIdParam.length > 200) {
        return NextResponse.json(
          { error: "Invalid file id." },
          { status: 400 }
        );
      }

      const tracking = await adminDb
        .collection("payment_uploads")
        .doc(fileIdParam)
        .get();

      const ownerId = tracking.exists
        ? ((tracking.data()?.user_id as string | undefined) ?? null)
        : null;

      if (!isAdmin && (!ownerId || ownerId !== uid)) {
        return NextResponse.json(
          { error: "Payment proof not found." },
          { status: 404 }
        );
      }

      fileId = fileIdParam;
    }

    // Nothing to serve.
    if (!fileId && !legacyUrl) {
      return NextResponse.json(
        { error: "No payment proof found for this record." },
        { status: 404 }
      );
    }
// -------------------------------------------------------------------------
    // Fetch the image server-side and stream the bytes back (never the URL).
    // -------------------------------------------------------------------------
    let upstreamUrl: string;

    if (fileId) {
      try {
        const file = await imagekit.files.get(fileId);
        const filePath = file.filePath;

        if (!filePath || !["/gosh/payment-proofs/", "/gosh/payments/"].some(prefix => filePath.startsWith(prefix))) {
          return NextResponse.json(
            { error: "Payment proof not found." },
            { status: 404 }
          );
        }

        // Payment proofs are uploaded as PRIVATE files (isPrivateFile: true), so
        // they can only be fetched via a signed ImageKit URL. We generate the
        // signed URL here, server-side, with a short expiry solely for the
        // upstream fetch below. The signed URL is NEVER returned to the browser
        // and the private key stays on the server.
        upstreamUrl = buildSignedImageKitUrl(filePath, 60);
      } catch  {
        console.error("Application operation failed.");
        return NextResponse.json(
          { error: "Could not retrieve payment proof." },
          { status: 404 }
        );
      }
    } else {
      // Legacy order with only a stored public URL.
      upstreamUrl = legacyUrl!;
    }

    let upstream: Response;
    if (!allowedReceiptUrl(upstreamUrl)) return NextResponse.json({ error: "Payment proof unavailable." }, { status: 404 });
    try {
      upstream = await fetch(upstreamUrl, {
        headers: { Accept: "image/*" },
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
    } catch  {
      console.error("Application operation failed.");
      return NextResponse.json(
        { error: "Could not retrieve payment proof." },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Could not retrieve payment proof." },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
    if (!imageTypes.has(contentType) || !upstream.body) return NextResponse.json({ error: "Invalid receipt content." }, { status: 502 });
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 10 * 1024 * 1024) { await reader.cancel(); return NextResponse.json({ error: "Receipt is too large." }, { status: 502 }); }
      chunks.push(value);
    }

    return new Response(Buffer.concat(chunks), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Never cache private receipts and never allow them to be sniffed.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline; filename=payment-proof",
      },
    });
  } catch  {
    console.error("Application operation failed.");
    return NextResponse.json(
      { error: "Could not retrieve payment proof." },
      { status: 500 }
    );
  }
}
