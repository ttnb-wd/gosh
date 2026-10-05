import { recordAdminChange } from "@/lib/security/audit";
import { InputError, readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { deleteImageKitFile } from "@/lib/imagekit";

type ProductActionBody =
  | {
      action: "save";
      productId?: string | null;
      expectedStock?: number;
      product: Record<string, unknown>;
    }
  | {
      action: "setActive";
      productId: string;
      isActive: boolean;
    }
  | {
      action: "delete";
      productId: string;
    };

function cleanProductPayload(product: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(product)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminApiAuth(request);

    const body = (await readJson(request, "productAction")) as ProductActionBody;

    if (!body || !body.action) {
      return NextResponse.json(
        { error: "Invalid product action." },
        { status: 400 }
      );
    }

    /*
     * SAVE PRODUCT
     */
    if (body.action === "save") {
      const productId =
        typeof body.productId === "string" && body.productId.trim()
          ? body.productId.trim()
          : null;

      const productData = cleanProductPayload(body.product);

      if (!productData.name || typeof productData.name !== "string") {
        return NextResponse.json(
          { error: "Product name is required." },
          { status: 400 }
        );
      }

      /*
       * Create new product
       */
      if (!productId) {
        const productRef = adminDb.collection("products").doc();

        const data = {
          ...productData,
          id: productRef.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          created_by: user.uid,
          updated_by: user.uid,
        };

        await productRef.set(data);
        await recordAdminChange(user.uid, "product.create", productRef.id);

        return NextResponse.json({
          data: {
            id: productRef.id,
            ...productData,
          },
        });
      }

      /*
       * Update existing product
       */
      const productRef = adminDb
        .collection("products")
        .doc(productId);

      // Do not overwrite inventory reserved by a checkout while the form was open.
      const existingData = await adminDb.runTransaction(async transaction => {
        const snapshot = await transaction.get(productRef);
        if (!snapshot.exists) throw new InputError("Product not found.", 404);
        const current = snapshot.data() as Record<string, unknown>;
        if (Number(current.stock || 0) !== body.expectedStock) {
          throw new InputError("Product inventory changed. Refresh the product before saving.", 409);
        }
        transaction.update(productRef, {
          ...productData,
          id: productId,
          updatedAt: FieldValue.serverTimestamp(),
          updated_by: user.uid,
        });
        return current;
      });

      /*
       * Capture the current ImageKit file id before it is overwritten so we
       * can remove the replaced file afterwards (avoids orphaned files).
       */
      const oldImageFileId =
        typeof existingData?.imageFileId === "string" &&
        existingData.imageFileId
          ? existingData.imageFileId
          : typeof existingData?.image_file_id === "string" &&
              existingData.image_file_id
            ? existingData.image_file_id
            : null;

      const newImageFileId =
        typeof productData.imageFileId === "string" &&
        productData.imageFileId
          ? productData.imageFileId
          : null;

      await recordAdminChange(user.uid, "product.update", productId);

      /*
       * Best-effort cleanup of the replaced/removed ImageKit file.
       * The Firestore document is already saved with the new image, so a
       * failed ImageKit delete only leaves an orphan — it never breaks the
       * product or points Firestore at a missing image.
       */
      if (oldImageFileId && oldImageFileId !== newImageFileId) {
        try {
          await deleteImageKitFile(oldImageFileId);
        } catch  {
          console.error("Application operation failed.");
        }
      }

      return NextResponse.json({
        data: {
          id: productId,
          ...existingData,
          ...productData,
        },
      });
    }

    /*
     * SET PRODUCT ACTIVE / INACTIVE
     */
    if (body.action === "setActive") {
      if (!body.productId) {
        return NextResponse.json(
          { error: "Product ID is required." },
          { status: 400 }
        );
      }

      const productRef = adminDb
        .collection("products")
        .doc(body.productId);

      const productSnapshot = await productRef.get();

      if (!productSnapshot.exists) {
        return NextResponse.json(
          { error: "Product not found." },
          { status: 404 }
        );
      }

      await productRef.update({
        is_active: body.isActive,
        updatedAt: FieldValue.serverTimestamp(),
        updated_by: user.uid,
      });

      return NextResponse.json({
        data: {
          id: body.productId,
          is_active: body.isActive,
        },
      });
    }

    /*
     * DELETE PRODUCT
     */
    if (body.action === "delete") {
      if (!body.productId) {
        return NextResponse.json(
          { error: "Product ID is required." },
          { status: 400 }
        );
      }

      const productRef = adminDb
        .collection("products")
        .doc(body.productId);

      const productSnapshot = await productRef.get();

      if (!productSnapshot.exists) {
        return NextResponse.json(
          { error: "Product not found." },
          { status: 404 }
        );
      }

      const productData = productSnapshot.data() as
        | Record<string, unknown>
        | undefined;

      const imageFileId =
        typeof productData?.imageFileId === "string" &&
        productData.imageFileId
          ? productData.imageFileId
          : typeof productData?.image_file_id === "string" &&
              productData.image_file_id
            ? productData.image_file_id
            : null;

      /*
       * Delete the Firestore document FIRST so we never leave Firestore
       * pointing at an image that has already been removed.
       */
      await productRef.delete();
      await recordAdminChange(user.uid, "product.delete", body.productId);

      /*
       * Best-effort cleanup of the corresponding ImageKit file.
       */
      if (imageFileId) {
        try {
          await deleteImageKitFile(imageFileId);
        } catch  {
          console.error("Application operation failed.");
        }
      }

      return NextResponse.json({
        data: {
          id: body.productId,
          deleted: true,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid product action." },
      { status: 400 }
    );
  } catch (error) { return securityError(error); }
}
