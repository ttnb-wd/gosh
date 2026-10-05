import { publicProduct, publicPromotion } from "@/lib/security/public-data";
import { limitRequest } from "@/lib/security/abuse";
import { NextResponse } from "next/server";
import { getActivePromotions } from "@/lib/firebase/promotions-server";
import { getActiveProductPromotions } from "@/lib/firebase/product-promotions-server";
import { getProduct } from "@/lib/firebase/products-server";

/**
 * GET /api/promotions/unified
 *
 * Unified endpoint that returns both:
 * 1. Generic promotions (for homepage banner)
 * 2. Product promotions (for product pricing)
 *
 * This ensures consistent promotion data across the entire app.
 */
export async function GET(request: Request) {
  const limited = await limitRequest(request, "public-catalog", 120, 60);
  if (limited) return limited;

  try {

    // Fetch both types in parallel
    let genericPromotions, productPromotions;

    try {
      [genericPromotions, productPromotions] = await Promise.all([
        getActivePromotions(),
        getActiveProductPromotions(),
      ]);
    } catch (fetchError) {
      console.error("Application operation failed.");
      if (fetchError instanceof Error) {
        console.error("Application operation failed.");
        console.error("Application operation failed.");
        console.error("Application operation failed.");
      }
      throw fetchError;
    }

    // Enrich generic promotions with product data
    const enrichedGenericPromotions = await Promise.all(
      genericPromotions.map(async (promo) => {
        const serializedPromo = {
          ...publicPromotion(promo),
          start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
          end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
          created_at: promo.created_at && typeof promo.created_at === 'object' && 'toDate' in promo.created_at
            ? promo.created_at.toDate().toISOString()
            : promo.created_at,
          updated_at: promo.updated_at && typeof promo.updated_at === 'object' && 'toDate' in promo.updated_at
            ? promo.updated_at.toDate().toISOString()
            : promo.updated_at,
        };

        if (promo.type === "new_product" && promo.product_id) {
          try {
            const product = await getProduct(promo.product_id);
            return {
              ...serializedPromo,
              product: publicProduct(product),
            };
          } catch  {
            console.error("Application operation failed.");
            return serializedPromo;
          }
        }
        return serializedPromo;
      })
    );

    // Enrich product promotions with product data
    const enrichedProductPromotions = await Promise.all(
      productPromotions.map(async (promo) => {
        try {
          const product = await getProduct(promo.product_id);

          return {
            ...publicPromotion(promo),
            start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
            end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
            created_at: promo.created_at && typeof promo.created_at === 'object' && 'toDate' in promo.created_at
              ? promo.created_at.toDate().toISOString()
              : promo.created_at,
            updated_at: promo.updated_at && typeof promo.updated_at === 'object' && 'toDate' in promo.updated_at
              ? promo.updated_at.toDate().toISOString()
              : promo.updated_at,
            product: publicProduct(product),
          };
        } catch  {
          console.error("Application operation failed.");
          return {
            ...publicPromotion(promo),
            start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
            end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
            created_at: promo.created_at && typeof promo.created_at === 'object' && 'toDate' in promo.created_at
              ? promo.created_at.toDate().toISOString()
              : promo.created_at,
            updated_at: promo.updated_at && typeof promo.updated_at === 'object' && 'toDate' in promo.updated_at
              ? promo.updated_at.toDate().toISOString()
              : promo.updated_at,
            product: null,
          };
        }
      })
    );

    // Filter out product promotions where product couldn't be fetched or is inactive
    const validProductPromotions = enrichedProductPromotions.filter(
      (promo) => promo.product && promo.product.is_active === true
    );

    return NextResponse.json({
      success: true,
      data: {
        // Generic promotions for homepage banner
        bannerPromotions: enrichedGenericPromotions,
        // Product promotions for pricing
        productPromotions: validProductPromotions,
        // Combined count
        totalActive: enrichedGenericPromotions.length + validProductPromotions.length,
      },
    });
  } catch  {
    console.error("Application operation failed.");

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch promotions",
      },
      { status: 500 }
    );
  }
}
