import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

export type OrderItem = {
  id?: string;
  product_id: string | null;
  product_name: string;
  product_brand: string | null;
  product_image: string | null;
  selected_size: string | null;
  price: number;
  quantity: number;
};

export type OrderRecord = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  phone: string;
  address: string;
  city: string | null;
  payment_method: string;
  payment_status: string;
  payment_account_name: string | null;
  payment_phone: string | null;
  payment_account_number: string | null;
  payment_screenshot_url: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: string;
  stock_restored: boolean;
  created_at?: unknown;
  updated_at?: unknown;
  order_items?: OrderItem[];
};

type SiteSettingsDoc = {
  allow_cash_on_delivery?: boolean;
  allow_kbzpay?: boolean;
  allow_wavepay?: boolean;
  allow_ayapay?: boolean;
  allow_bank_transfer?: boolean;
  free_delivery_enabled?: boolean;
  delivery_fee?: number;
  minimum_order_amount?: number;
};

function getPaymentMethodStatus(
  method: string,
  settings: SiteSettingsDoc | null
): string {
  switch (method) {
    case "cod":
      if (settings?.allow_cash_on_delivery === false) {
        throw new Error("Cash on delivery is currently unavailable.");
      }
      return "Unpaid";
    case "kbzpay":
      if (settings?.allow_kbzpay === false) {
        throw new Error("KBZPay is currently unavailable.");
      }
      return "Verifying";
    case "wavepay":
      if (settings?.allow_wavepay === false) {
        throw new Error("WavePay is currently unavailable.");
      }
      return "Verifying";
    case "ayapay":
      if (settings?.allow_ayapay === false) {
        throw new Error("AYA Pay is currently unavailable.");
      }
      return "Verifying";
    case "bank":
      if (settings?.allow_bank_transfer === false) {
        throw new Error("Bank transfer is currently unavailable.");
      }
      return "Verifying";
    default:
      throw new Error("Invalid payment method.");
  }
}

function generateOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GOSH-${Date.now()}-${rand}`;
}

export interface PlaceOrderInput {
  user_id: string;
  customer_email: string | null;
  customer_name: string;
  phone: string;
  address: string;
  city: string | null;
  payment_method: string;
  payment_account_name: string | null;
  payment_phone: string | null;
  payment_account_number: string | null;
  payment_screenshot_url: string | null;
  payment_screenshot_file_id: string | null;
  items: Array<{
    product_id: string | null;
    selected_size: string | null;
    quantity: number;
  }>;
}

export async function placeOrder(input: PlaceOrderInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order must include at least one item.");
  }

  const settingsSnap = await adminDb
    .collection("site_settings")
    .doc("1")
    .get();

  const settings = (settingsSnap.exists
    ? (settingsSnap.data() as SiteSettingsDoc)
    : null) ?? null;

  const paymentStatus = getPaymentMethodStatus(
    input.payment_method,
    settings
  );

  const result = await adminDb.runTransaction(async (transaction) => {
    const trustedItems: OrderItem[] = [];
    let computedSubtotal = 0;

    for (const cartItem of input.items) {
      const quantity = Math.max(Math.trunc(Number(cartItem.quantity) || 1), 1);

      if (quantity > 99) {
        throw new Error("Quantity is too high for one order.");
      }

      if (!cartItem.product_id) {
        throw new Error(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }

      const productRef = adminDb
        .collection("products")
        .doc(cartItem.product_id);

      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw new Error(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }

      const product = productSnap.data() as Record<string, unknown> | undefined;

      if (product?.is_active === false) {
        throw new Error(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }

      const stock = Number(product?.stock ?? 0);

      if (stock < quantity) {
        throw new Error(
          `Only ${stock} left in stock for ${product?.name ?? "this product"}. Please reduce quantity or choose another product.`
        );
      }

      const decants = Array.isArray(product?.decants)
        ? (product.decants as Array<{ label?: string; price?: number }>)
        : [];

      const cleanSelectedSize = (cartItem.selected_size ?? "").trim();
      const isFullSize = cleanSelectedSize.toLowerCase() === "full size";

      let trustedSelectedSize: string | null = null;
      let trustedPrice = 0;

      if (decants.length > 0 && cleanSelectedSize && !isFullSize) {
        const matched = decants.find((d) => d.label === cleanSelectedSize);

        if (!matched || typeof matched.price !== "number" || matched.price < 0) {
          throw new Error(
            `Selected decant size is no longer available for ${product?.name ?? "this product"}.`
          );
        }

        trustedSelectedSize = matched.label ?? cleanSelectedSize;
        trustedPrice = matched.price;
      } else {
        trustedPrice = Number(product?.price ?? 0) || 0;
        const category = String(product?.category ?? "").toLowerCase();

        trustedSelectedSize =
          category === "accessories" || category === "accessory"
            ? "Accessory"
            : decants.length > 0
              ? "Full Size"
              : null;
      }

      transaction.update(productRef, {
        stock: stock - quantity,
        updated_at: FieldValue.serverTimestamp(),
      });

      computedSubtotal += trustedPrice * quantity;

      trustedItems.push({
        product_id: cartItem.product_id,
        product_name: typeof product?.name === "string" ? product.name : "",
        product_brand:
          typeof product?.brand === "string" ? product.brand : null,
        product_image:
          typeof product?.image === "string" ? product.image : null,
        selected_size: trustedSelectedSize,
        price: trustedPrice,
        quantity,
      });
    }

    const minimumOrderAmount = Number(settings?.minimum_order_amount ?? 0) || 0;

    if (minimumOrderAmount > 0 && computedSubtotal < minimumOrderAmount) {
      throw new Error(`Minimum order amount is ${minimumOrderAmount} MMK.`);
    }

    const computedDeliveryFee =
      settings?.free_delivery_enabled === false
        ? Math.max(Number(settings?.delivery_fee ?? 0) || 0, 0)
        : 0;

    const computedDiscount = 0;
    const computedTotal = Math.max(
      computedSubtotal + computedDeliveryFee - computedDiscount,
      0
    );

    const orderRef = adminDb.collection("orders").doc();
    const orderNumber = generateOrderNumber();
    const now = FieldValue.serverTimestamp();

    const orderDoc = {
      order_number: orderNumber,
      user_id: input.user_id,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email,
      phone: input.phone.trim(),
      address: input.address.trim(),
      city: input.city?.trim() || null,
      payment_method: input.payment_method,
      payment_status: paymentStatus,
      payment_account_name: input.payment_account_name,
      payment_phone: input.payment_phone,
      payment_account_number: input.payment_account_number,
      payment_screenshot_url: input.payment_screenshot_url,
      subtotal: computedSubtotal,
      delivery_fee: computedDeliveryFee,
      discount: computedDiscount,
      total: computedTotal,
      status: "Pending",
      stock_restored: false,
      created_at: now,
      updated_at: now,
    };

    transaction.set(orderRef, orderDoc);

    trustedItems.forEach((item, index) => {
      transaction.set(
        orderRef.collection("items").doc(String(index).padStart(4, "0")),
        {
          ...item,
          order_id: orderRef.id,
          created_at: now,
        }
      );
    });

    /*
     * Create a payment record for this order so admins can track, verify or
     * reject payments independently of order state.
     * Stored in: payments/{paymentId}
     */
    const paymentRef = adminDb.collection("payments").doc();

    transaction.set(paymentRef, {
      order_id: orderRef.id,
      user_id: input.user_id,
      payment_method: input.payment_method,
      payment_status: paymentStatus,
      payment_account_name: input.payment_account_name,
      payment_phone: input.payment_phone,
      payment_account_number: input.payment_account_number,
      payment_screenshot_url: input.payment_screenshot_url,
      payment_screenshot_file_id: input.payment_screenshot_file_id,
      amount: computedTotal,
      created_at: now,
      updated_at: now,
    });

    return {
      id: orderRef.id,
      order_number: orderNumber,
      customer_name: orderDoc.customer_name,
      phone: orderDoc.phone,
      total: computedTotal,
      payment_method: orderDoc.payment_method,
      payment_status: orderDoc.payment_status,
      status: orderDoc.status,
      created_at: new Date().toISOString(),
      order_items: trustedItems.map((item) => ({
        order_id: orderRef.id,
        ...item,
      })),
    };
  });

  /*
   * The payment screenshot is now referenced by the order/payment records, so
   * the temporary upload-ownership record in payment_uploads/{fileId} is no
   * longer needed. Best-effort cleanup keeps the collection from growing.
   */
  if (input.payment_screenshot_file_id) {
    await adminDb
      .collection("payment_uploads")
      .doc(input.payment_screenshot_file_id)
      .delete()
      .catch(() => {
        // Non-critical cleanup.
      });
  }

  return result;
}

export async function updateOrderStatus(
  orderId: string,
  status: string
) {
  const orderRef = adminDb.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new Error("Order not found.");
  }

  const order = orderSnap.data() as Record<string, unknown> | undefined;
  const previousStatus = String(order?.status ?? "");

  if (status === "Cancelled" && previousStatus !== "Cancelled") {
    const stockRestored = order?.stock_restored === true;

    if (!stockRestored) {
      const itemsSnap = await orderRef.collection("items").get();
      const restorable = new Map<string, number>();

      itemsSnap.forEach((itemDoc) => {
        const item = itemDoc.data() as Record<string, unknown> | undefined;
        const productId =
          typeof item?.product_id === "string" ? item.product_id : null;
        const selectedSize = String(item?.selected_size ?? "").toLowerCase();
        const quantity = Number(item?.quantity ?? 0);

        if (!productId || !quantity) return;
        if (
          selectedSize &&
          selectedSize !== "full size" &&
          selectedSize !== "full_size" &&
          selectedSize !== "accessory"
        ) {
          return;
        }

        restorable.set(
          productId,
          (restorable.get(productId) || 0) + quantity
        );
      });

      await adminDb.runTransaction(async (transaction) => {
        for (const [productId, quantity] of restorable) {
          const productRef = adminDb.collection("products").doc(productId);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists) continue;

          const product = productSnap.data() as Record<string, unknown> | undefined;
          const currentStock = Number(product?.stock ?? 0);

          transaction.update(productRef, { stock: currentStock + quantity });
        }

        transaction.update(orderRef, { stock_restored: true });
      });
    }
  }

  await orderRef.update({
    status,
    updated_at: FieldValue.serverTimestamp(),
  });

  return { id: orderId, status };
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string
) {
  const orderRef = adminDb.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new Error("Order not found.");
  }

  const order = orderSnap.data() as Record<string, unknown> | undefined;
  const paymentMethod = String(order?.payment_method ?? "");

  if (
    paymentStatus === "Paid" &&
    ["kbzpay", "wavepay", "ayapay", "bank"].includes(paymentMethod) &&
    !order?.payment_screenshot_url
  ) {
    throw new Error(
      "Payment proof is missing. Upload or confirm proof before marking this prepaid order as Paid."
    );
  }

  await orderRef.update({
    payment_status: paymentStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  /*
   * Keep the matching payment record in sync so admin verification / rejection
   * is reflected in payments/{paymentId}.
   */
  const paymentsSnap = await adminDb
    .collection("payments")
    .where("order_id", "==", orderId)
    .limit(1)
    .get();

  if (!paymentsSnap.empty) {
    await paymentsSnap.docs[0].ref.update({
      payment_status: paymentStatus,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  return { id: orderId, payment_status: paymentStatus };
}