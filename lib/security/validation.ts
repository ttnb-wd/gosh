// Runtime validation shared by server boundaries. No request-provided keys are
// selected dynamically for collection paths or privileged database writes.
export class InputError extends Error {
  constructor(message = "Invalid request body.", public status = 400) { super(message); }
}
type Check = (value: unknown) => boolean;
const optional = (check: Check): Check => v => v === undefined || check(v);
const nullable = (check: Check): Check => v => v === null || check(v);
const text = (max: number, min = 0): Check => v => typeof v === "string" && v.length <= max && v.trim().length >= min && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const number = (max: number, min = 0, integer = false): Check => v => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const boolean: Check = v => typeof v === "boolean";
const oneOf = (...values: string[]): Check => v => typeof v === "string" && values.includes(v);
export function validId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(v);
}
export function safeUrl(v: unknown, allowRelative = true): v is string {
  if (typeof v !== "string" || v.length > 2048 || /[\\\s\u0000-\u001f]/.test(v)) return false;
  if (allowRelative && v.startsWith("/") && !v.startsWith("//")) return true;
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}
const image: Check = v => v === "" || v === null || safeUrl(v);
const date: Check = v => {
  if (typeof v !== "string" || v.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const [year, month, day] = v.slice(0, 10).split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};
const array = (check: Check, max: number, min = 0): Check => v => Array.isArray(v) && v.length >= min && v.length <= max && v.every(check);
function shape(fields: Record<string, Check>): Check {
  return v => !!v && typeof v === "object" && !Array.isArray(v) &&
    Object.keys(v).every(k => Object.hasOwn(fields, k)) &&
    Object.entries(fields).every(([k, check]) => check((v as Record<string, unknown>)[k]));
}
const optionalText = (max: number) => optional(nullable(text(max)));
const optionalId = optional(v => v === null || v === "" || validId(v));
const optionalImage = optional(image);
const token = text(2048, 1);
const email: Check = v => typeof v === "string" && v.length <= 254 && /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(v);
const notes = shape({ story: optional(text(5000)), top: optional(array(text(100), 30)), heart: optional(array(text(100), 30)), base: optional(array(text(100), 30)), madeWith: optional(text(1000)), bestFor: optional(text(1000)) });
const product = shape({
  name: text(200, 1), price: number(1_000_000_000), stock: number(1_000_000, 0, true),
  brand: optionalText(200), brand_id: optionalId, description: optionalText(5000),
  image: optionalImage, imageFileId: optionalId, category: optionalText(100), badge: optionalText(100),
  scent_collection: optionalText(100), is_active: boolean, is_featured: optional(boolean),
  decants: optional(array(shape({ label: text(100, 1), price: number(1_000_000_000) }), 30)), notes: optional(nullable(notes)),
});
const banner = shape({ type: oneOf("promotion", "new_product"), title: text(200, 1), description: text(5000, 1),
  cta_text: text(100, 1), cta_url: v => safeUrl(v), image: optionalImage, imageFileId: optionalId,
  product_id: optionalId, is_active: optional(boolean), start_at: date, end_at: date });
const promotion = shape({ product_id: validId, promotion_price: number(1_000_000_000, 0.01), is_active: optional(boolean), start_at: date, end_at: date });
export const orderStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
export const paymentStatuses = ["Unpaid", "Verifying", "Paid", "Failed", "Refunded"];
export const schemas: Record<string, Check> = {
  brandDelete: shape({ brandId: validId }), testimonialDelete: shape({ testimonialId: validId }),
  contact: shape({ fullName: text(100, 2), email, subject: text(200, 1), message: text(5000, 10), token }),
  newsletter: shape({ email, token }),
  testimonial: shape({ name: text(100, 2), role: optionalText(100), comment: text(1000, 10), rating: optional(number(5, 1, true)), avatarUrl: optionalImage, turnstileToken: token }),
  turnstile: shape({ token }), reset: shape({ email }), file: shape({ fileId: validId }), orderEmail: shape({ orderId: validId }),
  statusEmail: shape({ orderId: validId, previousStatus: oneOf(...orderStatuses), nextStatus: oneOf(...orderStatuses) }),
  status: v => shape({ type: oneOf("order"), orderId: validId, status: oneOf(...orderStatuses) })(v) || shape({ type: oneOf("payment"), orderId: validId, paymentStatus: oneOf(...paymentStatuses) })(v),
  customers: shape({ page: optional(number(100_000, 1, true)), pageSize: optional(number(100, 1, true)), search: optional(text(200)), filter: optional(oneOf("all", "customers", "admins", "has_orders", "no_orders")), sort: optional(oneOf("newest", "oldest", "highest_spent", "most_orders")) }),
  productAction: v => (shape({ action: oneOf("save"), productId: optionalId, expectedStock: optional(number(1_000_000, 0, true)), product })(v) && (!(v as { productId?: string }).productId || number(1_000_000, 0, true)((v as { expectedStock?: number }).expectedStock))) || shape({ action: oneOf("delete"), productId: validId })(v) || shape({ action: oneOf("setActive"), productId: validId, isActive: boolean })(v),
  bannerAction: v => promotionAction(v, banner), promotionAction: v => promotionAction(v, promotion),
  checkout: shape({ customerName: text(100, 2), phone: text(20, 1), address: text(500, 1), city: text(100, 1),
    paymentMethod: oneOf("cod", "kbzpay", "wavepay", "ayapay", "bank"), paymentAccountName: optionalText(200), paymentPhone: optionalText(50), paymentAccountNumber: optionalText(100),
    paymentScreenshotUrl: optional(v => v === null || v === ""), paymentScreenshotFileId: optionalId,
    items: array(shape({ product_id: validId, selected_size: optionalText(100), quantity: number(99, 1, true) }), 100, 1) }),
};
function promotionAction(v: unknown, data: Check): boolean {
  if (shape({ action: oneOf("delete", "toggle"), promotionId: validId })(v)) return true;
  if (!shape({ action: oneOf("create", "update"), promotionId: optionalId, data })(v)) return false;
  const b = v as { action: string; promotionId?: string; data: { start_at: string; end_at: string } };
  return (b.action !== "update" || validId(b.promotionId)) && Date.parse(b.data.end_at) > Date.parse(b.data.start_at);
}
export async function readJson(request: Request, schema: string): Promise<ReturnType<typeof JSON.parse>> {
  const max = 64 * 1024;
  if (!request.body || Number(request.headers.get("content-length") || 0) > max) throw new InputError("Invalid request body.", 413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length;
      if (size > max) { await reader.cancel(); throw new InputError("Request body is too large.", 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new InputError(); }
  if (!schemas[schema]?.(body)) throw new InputError();
  return body;
}
