import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";

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
  
  /** Promotion validity period */
  start_at: Timestamp;
  end_at: Timestamp;
  
  created_at: Timestamp | FieldValue;
  updated_at: Timestamp | FieldValue;
};

const productPromotionsCollection = adminDb.collection("product_promotions");

/**
 * Get a single product promotion by ID
 */
export async function getProductPromotion(
  promotionId: string
): Promise<ProductPromotion | null> {
  const snapshot = await productPromotionsCollection.doc(promotionId).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<ProductPromotion, "id">),
  };
}

/**
 * Get product promotion by product ID
 */
export async function getProductPromotionByProductId(
  productId: string
): Promise<ProductPromotion | null> {
  const snapshot = await productPromotionsCollection
    .where("product_id", "==", productId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...(doc.data() as Omit<ProductPromotion, "id">),
  };
}

/**
 * Get all product promotions (admin view)
 */
export async function getAllProductPromotions(): Promise<ProductPromotion[]> {
  const snapshot = await productPromotionsCollection
    .orderBy("created_at", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ProductPromotion, "id">),
  }));
}

/**
 * Get only currently active product promotions
 * A promotion is active if:
 * - is_active === true
 * - current time is between start_at and end_at
 */
export async function getActiveProductPromotions(): Promise<ProductPromotion[]> {
  const now = Timestamp.now();
  
  // Query only active promotions, then filter by date in-memory
  const snapshot = await productPromotionsCollection
    .where("is_active", "==", true)
    .orderBy("created_at", "desc")
    .get();

  const allActive = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ProductPromotion, "id">),
  }));

  // Filter by date range
  const activePromotions = allActive.filter((promo) => {
    const startAt = promo.start_at;
    const endAt = promo.end_at;
    
    if (!startAt || !endAt) {
      return false;
    }

    const startMillis = startAt.toMillis();
    const endMillis = endAt.toMillis();
    const nowMillis = now.toMillis();

    return startMillis <= nowMillis && endMillis >= nowMillis;
  });

  return activePromotions;
}

/**
 * Create a new product promotion
 */
export async function createProductPromotion(
  data: Omit<ProductPromotion, "id" | "created_at" | "updated_at">
): Promise<ProductPromotion> {
  const promotionRef = productPromotionsCollection.doc();

  const promotion = {
    ...data,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };

  await promotionRef.set(promotion);

  return {
    id: promotionRef.id,
    ...(promotion as Omit<ProductPromotion, "id">),
  };
}

/**
 * Update an existing product promotion
 */
export async function updateProductPromotion(
  promotionId: string,
  data: Partial<Omit<ProductPromotion, "id" | "created_at" | "updated_at">>
): Promise<void> {
  await productPromotionsCollection.doc(promotionId).update({
    ...data,
    updated_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a product promotion
 */
export async function deleteProductPromotion(
  promotionId: string
): Promise<void> {
  await productPromotionsCollection.doc(promotionId).delete();
}
