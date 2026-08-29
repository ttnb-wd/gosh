import { NextResponse } from "next/server";
import imagekit from "@/lib/imagekit";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminApiAuth(request);

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `product-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    const result = await imagekit.files.upload({
      file: buffer.toString("base64"),
      fileName,
      folder: "/gosh/products",
      useUniqueFileName: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        fileId: result.fileId,
        name: result.name,
      },
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Image upload failed.";

    const status = message === "Admin access required" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}