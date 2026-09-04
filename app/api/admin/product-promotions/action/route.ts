import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { Timestamp } from "firebase-admin/firestore";
import {
  createProductPromotion,
  updateProductPromotion,
  deleteProductPromotion,
  getProductPromotion,
  getAllProductPromotions,
  getProductPromotionByProductId,
} from "@/lib/firebase/product-promotions-server";
import { getProduct } from "@/lib/firebase/products-server";

/**
 * GET /api/admin/product-promotions/action
 * Fetch all product promotions (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);

    const promotions = await getAllProductPromotions();

    // Serialize Firestore Timestamps to ISO strings for JSON transmission
    const serializedPromotions = promotions.map(promo => ({
      ...promo,
      start_at: promo.start_at?.toDate?.()?.toISOString() || promo.start_at,
      end_at: promo.end_at?.toDate?.()?.toISOString() || promo.end_at,
      created_at: promo.created_at && typeof promo.created_at === 'object' && 'toDate' in promo.created_at
        ? promo.created_at.toDate().toISOString()
        : promo.created_at,
      updated_at: promo.updated_at && typeof promo.updated_at === 'object' && 'toDate' in promo.updated_at
        ? promo.updated_at.toDate().toISOString()
        : promo.updated_at,
    }));

    return NextResponse.json({
      success: true,
      promotions: serializedPromotions,
    });
  } catch (error) {
    console.error("GET product promotions error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product promotions",
      },
      { status: error instanceof Error && error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/product-promotions/action
 * Create, update, delete, or toggle product promotion
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);

    const body = await request.json();
    const { action, promotionId, data } = body;

    if (action === "create") {
      // Validate required fields
      if (
        !data.product_id ||
        !data.promotion_price ||
        !data.start_at ||
        !data.end_at
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields",
          },
          { status: 400 }
        );
      }

      // Verify product exists
      const product = await getProduct(data.product_id);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "Product not found",
          },
          { status: 400 }
        );
      }

      // Check if promotion already exists for this product
      const existingPromotion = await getProductPromotionByProductId(data.product_id);
      if (existingPromotion) {
        return NextResponse.json(
          {
            success: false,
            error: "A promotion already exists for this product. Please edit the existing one.",
          },
          { status: 400 }
        );
      }

      // Validate promotion price is less than original price
      if (data.promotion_price >= product.price) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion price must be less than the original product price",
          },
          { status: 400 }
        );
      }

      // Convert date strings to Firestore Timestamps
      const promotionData = {
        ...data,
        start_at: Timestamp.fromDate(new Date(data.start_at)),
        end_at: Timestamp.fromDate(new Date(data.end_at)),
        is_active: data.is_active ?? false,
      };

      const promotion = await createProductPromotion(promotionData);

      return NextResponse.json({
        success: true,
        promotion,
      });
    }

    if (action === "update") {
      if (!promotionId) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion ID is required",
          },
          { status: 400 }
        );
      }

      const existing = await getProductPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      // If promotion price is being updated, validate against product price
      if (data.promotion_price) {
        const product = await getProduct(existing.product_id);
        if (product && data.promotion_price >= product.price) {
          return NextResponse.json(
            {
              success: false,
              error: "Promotion price must be less than the original product price",
            },
            { status: 400 }
          );
        }
      }

      // Convert date strings to Timestamps if present
      const updateData: Record<string, unknown> = { ...data };
      if (data.start_at) {
        updateData.start_at = Timestamp.fromDate(new Date(data.start_at));
      }
      if (data.end_at) {
        updateData.end_at = Timestamp.fromDate(new Date(data.end_at));
      }

      await updateProductPromotion(promotionId, updateData);

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "delete") {
      if (!promotionId) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion ID is required",
          },
          { status: 400 }
        );
      }

      const existing = await getProductPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      await deleteProductPromotion(promotionId);

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "toggle") {
      if (!promotionId) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion ID is required",
          },
          { status: 400 }
        );
      }

      const existing = await getProductPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      await updateProductPromotion(promotionId, {
        is_active: !existing.is_active,
      });

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST product promotions action error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process product promotion action",
      },
      { status: error instanceof Error && error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
