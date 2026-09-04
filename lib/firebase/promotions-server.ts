import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";

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
  
  /** Promotion visibility period */
  start_at: Timestamp;
  end_at: Timestamp;
  
  created_at: Timestamp | FieldValue;
  updated_at: Timestamp | FieldValue;
};

const promotionsCollection = adminDb.collection("promotions");

/**
 * Get a single promotion by ID
 */
export async function getPromotion(
  promotionId: string
): Promise<Promotion | null> {
  const snapshot = await promotionsCollection.doc(promotionId).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Promotion, "id">),
  };
}

/**
 * Get all promotions (admin view)
 */
export async function getAllPromotions(): Promise<Promotion[]> {
  const snapshot = await promotionsCollection
    .orderBy("created_at", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Promotion, "id">),
  }));
}

/**
 * Get only currently active and visible promotions (customer view)
 * 
 * A promotion is visible if:
 * - is_active === true
 * - current time is between start_at and end_at
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const now = Timestamp.now();
  
  console.log("[getActivePromotions] Current time:", now.toDate().toISOString());
  
  // Query only active promotions, then filter by date in-memory
  // This avoids needing a composite index for multiple range queries
  const snapshot = await promotionsCollection
    .where("is_active", "==", true)
    .orderBy("created_at", "desc")
    .get();

  console.log("[getActivePromotions] Found", snapshot.docs.length, "active promotions");

  // Filter promotions by date range
  const allActive = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Promotion, "id">),
  }));

  // Log each promotion for debugging
  allActive.forEach((promo, index) => {
    console.log(`[getActivePromotions] Promotion ${index}:`, {
      id: promo.id,
      title: promo.title,
      is_active: promo.is_active,
      start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
      end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
      hasStartAt: !!promo.start_at,
      hasEndAt: !!promo.end_at,
    });
  });

  const activePromotions = allActive.filter((promo) => {
      // Safely handle timestamp comparisons
      const startAt = promo.start_at;
      const endAt = promo.end_at;
      
      if (!startAt || !endAt) {
        console.log(`[getActivePromotions] Filtered out ${promo.id}: missing timestamps`);
        return false;
      }

      const startMillis = startAt.toMillis();
      const endMillis = endAt.toMillis();
      const nowMillis = now.toMillis();

      const isInRange = startMillis <= nowMillis && endMillis >= nowMillis;
      
      console.log(`[getActivePromotions] ${promo.id} time check:`, {
        startMillis,
        nowMillis,
        endMillis,
        startBeforeNow: startMillis <= nowMillis,
        endAfterNow: endMillis >= nowMillis,
        isInRange,
      });

      return isInRange;
    });

  console.log("[getActivePromotions] Returning", activePromotions.length, "promotions after filtering");

  return activePromotions;
}

/**
 * Create a new promotion
 */
export async function createPromotion(
  data: Omit<Promotion, "id" | "created_at" | "updated_at">
): Promise<Promotion> {
  const promotionRef = promotionsCollection.doc();

  const promotion = {
    ...data,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };

  await promotionRef.set(promotion);

  return {
    id: promotionRef.id,
    ...(promotion as Omit<Promotion, "id">),
  };
}

/**
 * Update an existing promotion
 */
export async function updatePromotion(
  promotionId: string,
  data: Partial<Omit<Promotion, "id" | "created_at" | "updated_at">>
): Promise<void> {
  await promotionsCollection.doc(promotionId).update({
    ...data,
    updated_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a promotion
 */
export async function deletePromotion(
  promotionId: string
): Promise<void> {
  await promotionsCollection.doc(promotionId).delete();
}
