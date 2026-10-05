// Positive selection prevents new private/admin fields from leaking when
// documents evolve. Firestore client-readable documents must contain only
// intentionally public data; Rules cannot hide individual document fields.
import { safeUrl } from "./validation";
export function publicPromotion<T extends object>(data: T) {
  const keys = ["id", "type", "title", "description", "image", "cta_text", "cta_url", "product_id", "is_active", "start_at", "end_at", "created_at", "updated_at", "promotion_price", "original_price", "discount_percent", "discount_amount"];
  const result = Object.fromEntries(keys.filter(k => Object.hasOwn(data, k)).map(k => [k, (data as Record<string, unknown>)[k]]));
  if (result.cta_url && !safeUrl(result.cta_url)) result.cta_url = "/";
  if (result.image && !safeUrl(result.image)) result.image = null;
  return result;
}
export function publicProduct<T extends object>(data: T | null) {
  if (!data || (data as Record<string, unknown>).is_active !== true) return null;
  const keys = ["id", "name", "brand", "brand_id", "price", "description", "image", "image_url", "badge", "category", "scent_collection", "is_active", "decants", "notes"];
  return Object.fromEntries(keys.filter(k => Object.hasOwn(data, k)).map(k => [k, (data as Record<string, unknown>)[k]]));
}
