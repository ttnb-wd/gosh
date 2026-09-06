import { NextResponse } from "next/server";
import { getAllProductsWithPromotions } from "@/lib/firebase/products-with-promotions-server";

/**
 * GET /api/products/with-promotions
 * 
 * Returns all products enriched with their promotion data.
 * Each product includes:
 * - display_price: Either promotion price or regular price
 * - has_promotion: Boolean flag
 * - promotion: Full promotion details if active
 * 
 * This is the primary endpoint for product listings that need to show promotions.
 */
export async function GET() {
  try {
    const productsWithPromotions = await getAllProductsWithPromotions();

    // Serialize for JSON transmission
    const serialized = productsWithPromotions.map(product => {
      const result: any = { ...product };
      
      // Convert any Timestamp objects to ISO strings
      if (result.createdAt && typeof result.createdAt === 'object' && 'toDate' in result.createdAt) {
        result.createdAt = result.createdAt.toDate().toISOString();
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
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products with promotions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
