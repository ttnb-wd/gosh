import { NextRequest, NextResponse } from "next/server";
import imagekit from "@/lib/imagekit";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);

    const formData = await request.formData();

    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    /*
     * Restrict the ImageKit folder to a safe "/gosh/..." path (no path
     * traversal / control characters). Admin-only route, but this prevents an
     * admin account with a compromised client from writing outside the app's
     * folder tree.
     */
    const rawFolder = typeof folder === "string" ? folder.trim() : "";
    const safeFolder =
      rawFolder.startsWith("/gosh/") && !rawFolder.includes("..")
        ? rawFolder
        : "/gosh/uploads";

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be 10MB or less" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await imagekit.files.upload({
      file: buffer.toString("base64"),
      fileName: file.name,
      folder: safeFolder,
      useUniqueFileName: true,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      name: uploadResult.name,
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to upload image";

    const status = message === "Admin access required" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}