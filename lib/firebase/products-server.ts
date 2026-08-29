import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

/**
 * Canonical product schema — must stay in sync with:
 *
 *   - components/admin/ProductManager.tsx
 *   - components/ProductSection.tsx
 *   - app/api/admin/products/action/route.ts
 *
 * Canonical image fields : image, imageFileId
 * Canonical active field : is_active
 * Canonical timestamp    : createdAt
 *
 * Backward-compat aliases (read-only, never written by new code):
 *   image_url  → image
 *   image_file_id → imageFileId
 */
export type Product = {
  id: string;
  name: string;
  brand?: string | null;
  brand_id?: string | null;
  price: number;
  description?: string | null;

  /** Canonical image URL stored in ImageKit. */
  image?: string | null;
  /** Canonical ImageKit file ID (used for deletion). */
  imageFileId?: string | null;

  /** Backward-compat aliases — present on legacy documents. */
  image_url?: string | null;
  image_file_id?: string | null;

  badge?: string | null;
  category?: string | null;
  scent_collection?: string | null;
  stock: number;
  is_active: boolean;
  decants?: { label: string; price: number }[];
  notes?: Record<string, unknown> | null;

  createdAt?: FirebaseFirestore.Timestamp | FieldValue | null;
};

const productsCollection = adminDb.collection("products");

export async function getProduct(
  productId: string
): Promise<Product | null> {
  const snapshot = await productsCollection.doc(productId).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Product, "id">),
  };
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt">
): Promise<Product> {
  const productRef = productsCollection.doc();

  const product = {
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  };

  await productRef.set(product);

  return {
    id: productRef.id,
    ...(product as Omit<Product, "id">),
  };
}

export async function updateProduct(
  productId: string,
  data: Partial<Omit<Product, "id" | "createdAt">>
): Promise<void> {
  await productsCollection.doc(productId).update({
    ...data,
  });
}

export async function deleteProduct(
  productId: string
): Promise<void> {
  await productsCollection.doc(productId).delete();
}
