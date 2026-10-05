import "server-only";
import { randomUUID } from "node:crypto";
import { InputError } from "./validation";
export const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
export async function readUpload(request: Request) {
  const max = 11 * 1024 * 1024;
  if (!request.body || Number(request.headers.get("content-length") || 0) > max) throw new InputError("Upload is too large.", 413);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length;
      if (size > max) { await reader.cancel(); throw new InputError("Upload is too large.", 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  try {
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    if ([...form.keys()].some(k => !["file", "folder"].includes(k)) || form.getAll("file").length !== 1 || form.getAll("folder").length > 1) throw new InputError();
    return form;
  } catch (error) { if (error instanceof InputError) throw error; throw new InputError("Invalid upload."); }
}
export async function validatedImage(file: File, maxSize = 10 * 1024 * 1024) {
  if (file.size === 0 || file.size > maxSize || !imageTypes.has(file.type)) throw new InputError("Unsupported or oversized image.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const starts = (...bytes: number[]) => bytes.every((v, i) => buffer[i] === v);
  const mime = starts(0xff, 0xd8, 0xff) ? "image/jpeg" : starts(137,80,78,71,13,10,26,10) ? "image/png" :
    ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6)) ? "image/gif" :
    buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? "image/webp" :
    buffer.toString("ascii", 4, 8) === "ftyp" && ["heic","heix","hevc","hevx"].includes(buffer.toString("ascii", 8, 12)) ? "image/heic" :
    buffer.toString("ascii", 4, 8) === "ftyp" && ["mif1","msf1"].includes(buffer.toString("ascii", 8, 12)) ? "image/heif" : null;
  if (!mime || mime !== file.type) throw new InputError("Image content does not match its type.");
  const extension = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/gif":"gif", "image/heic":"heic", "image/heif":"heif" }[mime];
  return { buffer, fileName: `${randomUUID()}.${extension}` };
}
export function allowedReceiptUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const endpoint = new URL(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "");
    const prefix = endpoint.pathname.replace(/\/$/, "") + "/gosh/";
    return url.protocol === "https:" && endpoint.hostname === "ik.imagekit.io" && url.hostname === endpoint.hostname &&
      url.port === "" && !url.username && !url.password &&
      ["payment-proofs/", "payments/"].some(folder => url.pathname.startsWith(prefix + folder)) &&
      !/%2e|%2f|%5c|\\/i.test(url.pathname);
  } catch { return false; }
}
