import "server-only";
import { ImageKit } from "@imagekit/nodejs";

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

/**
 * Builds a short-lived SIGNED ImageKit URL for a private payment-proof file.
 *
 * The ImageKit private key is used ONLY here, on the server. The returned signed
 * URL is used solely as the upstream fetch target inside the authenticated proxy
 * route (/api/checkout/payment-proof) and is never returned to the browser.
 *
 * This uses the official @imagekit/nodejs signed-URL helper (`helper.buildSrc`),
 * which signs the full file URL (minus the url endpoint) + the expiry timestamp
 * with HMAC-SHA1 using the private key, then appends the `ik-t` / `ik-s` query
 * parameters. `expiresIn` is intentionally short so the signed URL cannot be
 * reused later.
 */
export function buildSignedImageKitUrl(
  filePath: string,
  expiresInSeconds: number
): string {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!urlEndpoint) {
    throw new Error("ImageKit URL endpoint is not configured.");
  }

  return imagekit.helper.buildSrc({
    urlEndpoint,
    src: filePath,
    signed: true,
    expiresIn: expiresInSeconds,
  });
}

/**
 * Deletes an ImageKit file by its `fileId`.
 *
 * This is a best-effort, server-only helper. The ImageKit private key is
 * only ever used on the server and is never exposed to the client.
 *
 * @param fileId The ImageKit file id (returned as `fileId` on upload).
 */
export async function deleteImageKitFile(
  fileId: string,
  purpose: "public" | "receipt" = "public"
): Promise<void> {
  if (!fileId) {
    return;
  }

  const file = await imagekit.files.get(fileId);
  const folders = purpose === "receipt" ? ["/gosh/payment-proofs/", "/gosh/payments/"]
    : ["/gosh/products/", "/gosh/promotions/", "/gosh/uploads/", "/products/", "/promotions/"];
  if (!file.filePath || !folders.some(folder => file.filePath!.startsWith(folder))) throw new Error("File is outside the authorized folder.");
  await imagekit.files.delete(fileId);
}

export default imagekit;
