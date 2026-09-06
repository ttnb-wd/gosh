import "server-only";

import { getAllProducts, getProduct, type Product } from "./products-server";
import { getActiveProductPromotions, getProductPromotionByProductId } from "./product-promotions-server";
import { enrichProductWithPromotion, enrichProductsWithPromotions, type EnrichedProduct } from "@/lib/promotions";

/**
 * Server-side service for fetching products enriched with promotion data
 * 
 * This is the centralized way to fetch products with correct promotional pricing.
 * Use these functions instead of direct product queries when you need promotion info.
 */

/**
 * Get a single product with its promotion data
 */
export async function getProductWithPromotion(
  productId: string
): Promise<EnrichedProduct | null> {
  try {
    const product = await getProduct(productId);
    if (!product) return null;

    const promotion = await getProductPromotionByProductId(productId);
    
    return enrichProductWithPromotion(product, promotion);
  } catch (error) {
    console.error("[getProductWithPromotion] Error:", error);
    throw error;
  }
}

/**
 * Get all products with their promotion data
 * Efficiently fetches all promotions once and enriches products
 */
export async function getAllProductsWithPromotions(): Promise<EnrichedProduct[]> {
  try {
    const [products, promotions] = await Promise.all([
      getAllProducts(),
      getActiveProductPromotions(),
    ]);

    return enrichProductsWithPromotions(products, promotions);
  } catch (error) {
    console.error("[getAllProductsWithPromotions] Error:", error);
    throw error;
  }
}

/**
 * Get active products with their promotion data
 * Filtered to only active products
 */
export async function getActiveProductsWithPromotions(): Promise<EnrichedProduct[]> {
  try {
    const allProductsWithPromotions = await getAllProductsWithPromotions();
    return allProductsWithPromotions.filter(p => p.is_active !== false);
  } catch (error) {
    console.error("[getActiveProductsWithPromotions] Error:", error);
    throw error;
  }
}

/**
 * Get products with active promotions only
 * Returns only products that currently have a promotion
 */
export async function getPromotedProducts(): Promise<EnrichedProduct[]> {
  try {
    const allProductsWithPromotions = await getAllProductsWithPromotions();
    return allProductsWithPromotions.filter(p => p.has_promotion && p.is_active !== false);
  } catch (error) {
    console.error("[getPromotedProducts] Error:", error);
    throw error;
  }
}
