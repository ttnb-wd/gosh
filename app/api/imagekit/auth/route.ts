import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import imagekit from "@/lib/imagekit";

export const runtime = "nodejs";

/**
 * GET /api/imagekit/auth
 *
 * Returns signed authentication parameters for a client-side ImageKit upload.
 *
 * The client (ProductManager) uses these to POST directly to:
 *   https://upload.imagekit.io/api/v1/files/upload
 *
 * Response shape expected by ProductManager:
 *   { token, expire, signature, publicKey }
 *
 * Protected: only authenticated admin users may obtain upload credentials.
 * The private key is NEVER sent to the browser.
 */
export async function GET(request: Request) {
  try {
    await requireAdminApiAuth(request);

    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

    if (!publicKey) {
      console.error("Missing NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY");
      return NextResponse.json(
        { error: "ImageKit is not configured." },
        { status: 500 }
      );
    }

    /*
     * getAuthenticationParameters() signs a token + expiry with the private
     * key (HMAC-SHA1) and returns { token, expire, signature }.
     * The private key stays on the server — only the signed params are sent.
     */
    const authParams = imagekit.helper.getAuthenticationParameters();

    return NextResponse.json({
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature,
      publicKey,
    });
  } catch (error) {
    console.error("ImageKit auth error:", error);

    const message =
      error instanceof Error ? error.message : "ImageKit auth failed.";

    const status = message === "Admin access required" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
