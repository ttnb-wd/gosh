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
  console.log("[unified] GET request received");
  console.log("[unified] Environment:", process.env.NODE_ENV);
  
  try {
    console.log("[unified] Fetching promotions in parallel...");
    
    // Fetch both types in parallel
    let genericPromotions, productPromotions;
    
    try {
      [genericPromotions, productPromotions] = await Promise.all([
        getActivePromotions(),
        getActiveProductPromotions(),
      ]);
      console.log("[unified] Fetch complete:", {
        genericCount: genericPromotions.length,
        productCount: productPromotions.length,
      });
    } catch (fetchError) {
      console.error("[unified] Parallel fetch failed:", fetchError);
      if (fetchError instanceof Error) {
        console.error("[unified] Fetch error name:", fetchError.name);
        console.error("[unified] Fetch error message:", fetchError.message);
        console.error("[unified] Fetch error stack:", fetchError.stack);
      }
      throw fetchError;
    }

    console.log("[unified] Enriching generic promotions...");
    
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

    console.log("[unified] Enriching product promotions...");

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

    console.log("[unified] Returning response:", {
      bannerPromotions: enrichedGenericPromotions.length,
      productPromotions: validProductPromotions.length,
      totalActive: enrichedGenericPromotions.length + validProductPromotions.length,
    });

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
    console.error("[unified] ============================================");
    console.error("[unified] FATAL ERROR - Promotions fetch failed");
    console.error("[unified] ============================================");
    console.error("[unified] Error object:", error);
    
    if (error instanceof Error) {
      console.error("[unified] Error name:", error.name);
      console.error("[unified] Error message:", error.message);
      console.error("[unified] Error stack:", error.stack);
      
      // Log any additional error properties
      const errorKeys = Object.keys(error);
      if (errorKeys.length > 0) {
        console.error("[unified] Additional error properties:", 
          errorKeys.reduce((acc, key) => {
            acc[key] = (error as any)[key];
            return acc;
          }, {} as Record<string, any>)
        );
      }
    }
    
    console.error("[unified] ============================================");

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch promotions",
        details: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
      },
      { status: 500 }
    );
  }
}
