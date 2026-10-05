import { publicProduct, publicPromotion } from "@/lib/security/public-data";
import { limitRequest } from "@/lib/security/abuse";
import { NextResponse } from "next/server";
import { getActivePromotions } from "@/lib/firebase/promotions-server";
import { getProduct } from "@/lib/firebase/products-server";

/**
 * GET /api/promotions/active
 * Public endpoint - Fetch only active promotions visible to customers
 *
 * A promotion is returned only if:
 * - is_active === true
 * - current time is between start_at and end_at
 */
export async function GET(request: Request) {
  const limited = await limitRequest(request, "public-catalog", 120, 60);
  if (limited) return limited;
  try {
    const promotions = await getActivePromotions();

    // Enrich new_product promotions with product data
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        // Serialize Firestore Timestamps to ISO strings for JSON transmission
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

    return NextResponse.json({
      success: true,
      promotions: enrichedPromotions,
    });
  } catch  {
    console.error("Application operation failed.");


    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch active promotions",
      },
      { status: 500 }
    );
  }
}
