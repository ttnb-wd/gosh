import { NextResponse } from "next/server";

import {
  createProduct,
  getProduct,
} from "@/lib/firebase/products-server";

import { requireFirebaseAdmin } from "@/lib/firebase/api-auth";

export const runtime = "nodejs";

/**
 * Legacy admin product API.
 *
 * New admin mutations should go through:
 *   POST /api/admin/products/action
 *
 * This route is kept for backward compatibility and uses the canonical
 * Firebase schema (image, imageFileId, is_active, createdAt).
 */

export async function GET(request: Request) {
  try {
    const { error } = await requireFirebaseAdmin(request);

    if (error) {
      return error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const product = await getProduct(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Products GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load product.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireFirebaseAdmin(request);

    if (error) {
      return error;
    }

    const body = await request.json();

    if (
      typeof body.name !== "string" ||
      !body.name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid product price is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body.stock !== "number" ||
      !Number.isInteger(body.stock) ||
      body.stock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid product stock is required.",
        },
        { status: 400 }
      );
    }

    const product = await createProduct({
      name: body.name.trim(),
      brand:
        typeof body.brand === "string"
          ? body.brand.trim()
          : null,
      brand_id:
        typeof body.brand_id === "string"
          ? body.brand_id
          : null,
      description:
        typeof body.description === "string"
          ? body.description.trim()
          : null,
      price: body.price,
      stock: body.stock,
      is_active:
        typeof body.is_active === "boolean"
          ? body.is_active
          : true,
      image:
        typeof body.image === "string"
          ? body.image
          : null,
      imageFileId:
        typeof body.imageFileId === "string"
          ? body.imageFileId
          : null,
      badge:
        typeof body.badge === "string"
          ? body.badge
          : null,
      category:
        typeof body.category === "string"
          ? body.category
          : null,
      scent_collection:
        typeof body.scent_collection === "string"
          ? body.scent_collection
          : null,
      decants: Array.isArray(body.decants)
        ? body.decants
        : [],
    });

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Products POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create product.",
      },
      { status: 500 }
    );
  }
}
