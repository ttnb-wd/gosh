/**
 * Shared promotion types for both client and server
 * 
 * These types are plain TypeScript with no Firebase imports
 * so they can be safely used in both client and server components.
 * 
 * Date fields accept either Firestore Timestamp objects or ISO strings
 * to work with both server-side Firestore data and serialized API responses.
 */

/**
 * Promotion schema for both Promotions and New Product Announcements
 * 
 * Type A: Promotion
 * - Generic promotional content
 * - No product_id required
 * 
 * Type B: New Product Announcement
 * - Links to an existing product
 * - Requires product_id
 */
export type Promotion = {
  id: string;
  type: "promotion" | "new_product";
  title: string;
  description: string;
  
  /** ImageKit URL */
  image?: string | null;
  /** ImageKit file ID (for deletion) */
  imageFileId?: string | null;
  
  cta_text: string;
  cta_url: string;
  
  /** For new_product type only */
  product_id?: string | null;
  
  is_active: boolean;
  
  /** Promotion visibility period - Firestore Timestamp or ISO string */
  start_at: unknown;
  end_at: unknown;
  
  created_at: unknown;
  updated_at: unknown;
};

/**
 * Product Promotion schema
 * 
 * Links to existing products to provide promotional pricing
 * Does NOT modify the original product price
 */
export type ProductPromotion = {
  id: string;
  product_id: string;
  promotion_price: number;
  is_active: boolean;
  
  /** Promotion validity period - Firestore Timestamp or ISO string */
  start_at: unknown;
  end_at: unknown;
  
  created_at: unknown;
  updated_at: unknown;
};
