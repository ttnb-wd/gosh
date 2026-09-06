import { NextResponse } from "next/server";
import { getActiveProductPromotions } from "@/lib/firebase/product-promotions-server";
import { getProduct } from "@/lib/firebase/products-server";

/**
 * GET /api/product-promotions/active
 * Public endpoint - Fetch only active product promotions visible to customers
 * 
 * A product promotion is returned only if:
 * - is_active === true
 * - current time is between start_at and end_at
 */
export async function GET() {
  try {
    const promotions = await getActiveProductPromotions();

    // Enrich with product data
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        try {
          const product = await getProduct(promo.product_id);
          
          // Serialize Firestore Timestamps to ISO strings for JSON transmission
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
          console.error(`[product-promotions/active] Product fetch error for promotion ${promo.id}:`, error);
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

    // Filter out promotions where product couldn't be fetched or is inactive
    const validPromotions = enrichedPromotions.filter(
      (promo) => promo.product && promo.product.is_active !== false
    );

    return NextResponse.json({
      success: true,
      promotions: validPromotions,
    });
  } catch (error) {
    console.error("[product-promotions/active] GET error:", error);
    
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch active product promotions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
