import { publicPromotion } from "@/lib/security/public-data";
import "server-only";

import { getAllProducts, getActiveProducts, getProduct, type Product } from "./products-server";
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
    console.error("Application operation failed.");
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
    console.error("Application operation failed.");
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
    console.error("Application operation failed.");
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
    console.error("Application operation failed.");
    throw error;
  }
}

/**
 * Public (safe) product shape returned to unauthenticated storefront clients.
 *
 * Deliberately EXCLUDES internal fields such as `stock`, `imageFileId` /
 * `image_file_id` and any other inventory/administrative data so a public
 * endpoint can never leak them, regardless of what is stored server-side.
 */
export type PublicProduct = {
  id: string | number;
  name: string;
  brand?: string | null;
  price: number;
  description?: string | null;
  image?: string | null;
  /** Legacy alias kept for frontend compatibility. */
  image_url?: string | null;
  badge?: string | null;
  category?: string | null;
  scent_collection?: string | null;
  is_active: boolean;
  decants?: { label: string; price: number }[];
  notes?: Record<string, unknown> | null;
  display_price: number;
  has_promotion: boolean;
  promotion?: EnrichedProduct["promotion"];
  createdAt?: string | null;
};

/**
 * Map a server-side (enriched) product to the safe public shape, stripping
 * internal/administrative fields.
 */
function toPublicProduct(product: Product & EnrichedProduct): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
    price: product.price ?? 0,
    description: product.description ?? null,
    image: product.image || product.image_url || null,
    image_url: product.image_url ?? null,
    badge:
      typeof product.badge === "string" && product.badge.trim()
        ? product.badge
        : null,
    category: product.category ?? null,
    scent_collection: product.scent_collection ?? null,
    is_active: true, // Only active products are fetched for this public endpoint.
    decants: Array.isArray(product.decants) ? product.decants : undefined,
    notes: product.notes ?? null,
    display_price: product.display_price,
    has_promotion: !!product.has_promotion,
    promotion: product.promotion ? publicPromotion(product.promotion) as unknown as EnrichedProduct["promotion"] : undefined,
  };
}

/**
 * Public storefront list of ACTIVE products enriched with their promotions.
 *
 * Used by /api/products/with-promotions. Only `is_active === true` products are
 * fetched from Firestore, and every product is mapped through `toPublicProduct`
 * so internal inventory/stock fields are never serialized to the client.
 */
export async function getPublicProductsWithPromotions(): Promise<PublicProduct[]> {
  const [products, promotions] = await Promise.all([
    getActiveProducts(),
    getActiveProductPromotions(),
  ]);

  const enriched = enrichProductsWithPromotions(products, promotions);

  return enriched.map((p) => toPublicProduct(p as Product & EnrichedProduct));
}
