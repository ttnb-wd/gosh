import { ImageKit } from "@imagekit/nodejs";

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

/**
 * Deletes an ImageKit file by its `fileId`.
 *
 * This is a best-effort, server-only helper. The ImageKit private key is
 * only ever used on the server and is never exposed to the client.
 *
 * @param fileId The ImageKit file id (returned as `fileId` on upload).
 */
export async function deleteImageKitFile(
  fileId: string
): Promise<void> {
  if (!fileId) {
    return;
  }

  await imagekit.files.delete(fileId);
}

export default imagekit;