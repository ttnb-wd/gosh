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
export async function GET() {
  try {
    // Fetch both types in parallel
    const [genericPromotions, productPromotions] = await Promise.all([
      getActivePromotions(),
      getActiveProductPromotions(),
    ]);

    // Enrich generic promotions with product data
    const enrichedGenericPromotions = await Promise.all(
      genericPromotions.map(async (promo) => {
        const serializedPromo = {
          ...promo,
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
              product: product || null,
            };
          } catch (error) {
            console.error("[unified] Product fetch error:", error);
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
            ...promo,
            start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
            end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
            created_at: promo.created_at && typeof promo.created_at === 'object' && 'toDate' in promo.created_at
              ? promo.created_at.toDate().toISOString()
              : promo.created_at,
            updated_at: promo.updated_at && typeof promo.updated_at === 'object' && 'toDate' in promo.updated_at
              ? promo.updated_at.toDate().toISOString()
              : promo.updated_at,
            product: product || null,
          };
        } catch (error) {
          console.error(`[unified] Product fetch error for promotion ${promo.id}:`, error);
          return {
            ...promo,
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
      (promo) => promo.product && promo.product.is_active !== false
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
  } catch (error) {
    console.error("[unified] GET error:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch promotions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
