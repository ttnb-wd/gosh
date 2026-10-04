import { NextResponse } from "next/server";
import { getPublicProductsWithPromotions } from "@/lib/firebase/products-with-promotions-server";

/**
 * GET /api/products/with-promotions
 *
 * PUBLIC storefront endpoint returning ONLY active products enriched with their
 * promotion data.
 *
 * Security (Phase 1):
 *  - Only `is_active === true` products are fetched and returned. Inactive /
 *    unpublished products are never exposed.
 *  - Internal inventory/stock fields (and ImageKit file IDs) are stripped by the
 *    server before the response is built — they are never sent to the client.
 *  - Query parameters are ignored: callers cannot abuse this endpoint to request
 *    inactive products or internal data.
 *
 * Each product includes:
 * - display_price: Either promotion price or regular price
 * - has_promotion: Boolean flag
 * - promotion: Full promotion details if active
 */
export async function GET() {
  try {
    const productsWithPromotions = await getPublicProductsWithPromotions();

    // Serialize for JSON transmission (dates/timestamps to ISO strings).
    const serialized = productsWithPromotions.map((product) => {
      const result: Record<string, unknown> = { ...product };

      // Normalize promotion date fields for JSON transport.
      const promotion = result.promotion as
        | (Record<string, unknown> & { start_at?: unknown; end_at?: unknown })
        | undefined;

      if (promotion) {
        const toIso = (value: unknown): unknown => {
          if (
            value &&
            typeof value === "object" &&
            "toDate" in value &&
            typeof (value as { toDate: () => Date }).toDate === "function"
          ) {
            return (value as { toDate: () => Date }).toDate().toISOString();
          }
          return value;
        };
        promotion.start_at = toIso(promotion.start_at);
        promotion.end_at = toIso(promotion.end_at);
      }

      return result;
    });

    return NextResponse.json({
      success: true,
      products: serialized,
      count: serialized.length,
    });
  } catch (error) {
    console.error("[products/with-promotions] GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products with promotions",
      },
      { status: 500 }
    );
  }
}
