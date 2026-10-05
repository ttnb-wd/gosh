import { publicProduct, publicPromotion } from "@/lib/security/public-data";
import { limitRequest } from "@/lib/security/abuse";
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
export async function GET(request: Request) {
  const limited = await limitRequest(request, "public-catalog", 120, 60);
  if (limited) return limited;
  try {
    const promotions = await getActiveProductPromotions();

    // Enrich with product data
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        try {
          const product = await getProduct(promo.product_id);

          // Serialize Firestore Timestamps to ISO strings for JSON transmission
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

    // Filter out promotions where product couldn't be fetched or is inactive
    const validPromotions = enrichedPromotions.filter(
      (promo) => promo.product && promo.product.is_active === true
    );

    return NextResponse.json({
      success: true,
      promotions: validPromotions,
    });
  } catch  {
    console.error("Application operation failed.");


    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch active product promotions",
      },
      { status: 500 }
    );
  }
}
