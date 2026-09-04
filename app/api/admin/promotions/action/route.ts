import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { Timestamp } from "firebase-admin/firestore";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotion,
  getAllPromotions,
} from "@/lib/firebase/promotions-server";
import { getProduct } from "@/lib/firebase/products-server";
import { deleteImageKitFile } from "@/lib/imagekit";

/**
 * GET /api/admin/promotions/action
 * Fetch all promotions (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);

    const promotions = await getAllPromotions();

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
    console.error("GET promotions error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch promotions",
      },
      { status: error instanceof Error && error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/promotions/action
 * Create a new promotion or update/delete existing one
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);

    const body = await request.json();
    const { action, promotionId, data } = body;

    if (action === "create") {
      // Validate required fields
      if (
        !data.type ||
        !data.title ||
        !data.description ||
        !data.cta_text ||
        !data.cta_url ||
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

      // Validate type
      if (data.type !== "promotion" && data.type !== "new_product") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid promotion type",
          },
          { status: 400 }
        );
      }

      // If type is new_product, validate product_id
      if (data.type === "new_product" && data.product_id) {
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
      }

      // Convert date strings to Firestore Timestamps
      const promotionData = {
        ...data,
        start_at: Timestamp.fromDate(new Date(data.start_at)),
        end_at: Timestamp.fromDate(new Date(data.end_at)),
        is_active: data.is_active ?? false,
      };

      const promotion = await createPromotion(promotionData);

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

      const existing = await getPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      // If type is new_product, validate product_id
      if (data.type === "new_product" && data.product_id) {
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
      }

      // Convert date strings to Timestamps if present
      const updateData: Record<string, unknown> = { ...data };
      if (data.start_at) {
        updateData.start_at = Timestamp.fromDate(new Date(data.start_at));
      }
      if (data.end_at) {
        updateData.end_at = Timestamp.fromDate(new Date(data.end_at));
      }

      // If image was replaced, delete old ImageKit file
      if (
        data.image &&
        data.imageFileId &&
        existing.imageFileId &&
        data.imageFileId !== existing.imageFileId
      ) {
        try {
          await deleteImageKitFile(existing.imageFileId);
        } catch (error) {
          console.error("ImageKit deletion error (non-fatal):", error);
        }
      }

      await updatePromotion(promotionId, updateData);

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

      const existing = await getPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      // Delete ImageKit file if present
      if (existing.imageFileId) {
        try {
          await deleteImageKitFile(existing.imageFileId);
        } catch (error) {
          console.error("ImageKit deletion error (non-fatal):", error);
        }
      }

      await deletePromotion(promotionId);

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

      const existing = await getPromotion(promotionId);
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Promotion not found",
          },
          { status: 404 }
        );
      }

      await updatePromotion(promotionId, {
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
    console.error("POST promotions action error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process promotion action",
      },
      { status: error instanceof Error && error.message === "Admin access required" ? 403 : 500 }
    );
  }
}
