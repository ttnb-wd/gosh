import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { createHash } from "node:crypto";
import devLog from "@/lib/dev-log";
import { InputError, validId, orderStatuses, paymentStatuses } from "@/lib/security/validation";

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
        throw new InputError("Cash on delivery is currently unavailable.");
      }
      return "Unpaid";
    case "kbzpay":
      if (settings?.allow_kbzpay === false) {
        throw new InputError("KBZPay is currently unavailable.");
      }
      return "Verifying";
    case "wavepay":
      if (settings?.allow_wavepay === false) {
        throw new InputError("WavePay is currently unavailable.");
      }
      return "Verifying";
    case "ayapay":
      if (settings?.allow_ayapay === false) {
        throw new InputError("AYA Pay is currently unavailable.");
      }
      return "Verifying";
    case "bank":
      if (settings?.allow_bank_transfer === false) {
        throw new InputError("Bank transfer is currently unavailable.");
      }
      return "Verifying";
    default:
      throw new InputError("Invalid payment method.");
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
  idempotency_key?: string;
  items: Array<{
    product_id: string | null;
    selected_size: string | null;
    quantity: number;
  }>;
}

export async function placeOrder(input: PlaceOrderInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InputError("Order must include at least one item.");
  }

  const settingsSnap = await adminDb
    .collection("site_settings")
    .doc("1")
    .get();

  const settings = (settingsSnap.exists
    ? (settingsSnap.data() as SiteSettingsDoc)
    : null) ?? null;

  const result = await adminDb.runTransaction(async (transaction) => {
    const requestRef = input.idempotency_key ? adminDb.collection("order_requests").doc(
      createHash("sha256").update(`${input.user_id}:${input.idempotency_key}`).digest("hex")) : null;
    const requestInput = { ...input };
    delete requestInput.idempotency_key;
    const fingerprint = createHash("sha256").update(JSON.stringify(requestInput)).digest("hex");
    if (requestRef) {
      const previous = await transaction.get(requestRef);
      if (previous.exists) {
        if (previous.data()?.fingerprint !== fingerprint) throw new InputError("Order request has changed. Please retry.", 409);
        devLog.log("Checkout idempotent retry", { idempotencyReused: true });
        return previous.data()!.result;
      }
    }
    // Retrieve a committed order before applying current availability to a NEW
    // order. A payment setting change must not turn a retry into another order.
    const paymentStatus = getPaymentMethodStatus(input.payment_method, settings);
    const receiptRef = input.payment_screenshot_file_id ? adminDb.collection("payment_uploads").doc(input.payment_screenshot_file_id) : null;
    if (receiptRef) {
      const receipt = await transaction.get(receiptRef);
      if (!receipt.exists || receipt.data()?.user_id !== input.user_id) throw new InputError("Payment proof not found.", 404);
      if (receipt.data()?.order_id || receipt.data()?.deleting) throw new InputError("Payment proof is already in use or unavailable.", 409);
    }
    const trustedReceiptUrl = receiptRef ? `/api/checkout/payment-proof?fileId=${encodeURIComponent(receiptRef.id)}` : null;
    const trustedItems: OrderItem[] = [];
    let computedSubtotal = 0;
    const quantities = new Map<string, number>();
    const products = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    // Firestore transactions must perform ALL reads before ANY writes. Aggregate
    // variants of the same product so duplicate lines cannot overspend stock.
    for (const item of input.items) {
      if (!validId(item.product_id)) throw new InputError("Invalid product.");
      quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + item.quantity);
    }
    for (const id of quantities.keys()) products.set(id, await transaction.get(adminDb.collection("products").doc(id)));

    for (const cartItem of input.items) {
      const quantity = Math.max(Math.trunc(Number(cartItem.quantity) || 1), 1);

      if (quantity > 99) {
        throw new InputError("Quantity is too high for one order.");
      }

      if (!cartItem.product_id) {
        throw new InputError(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }



      const productSnap = products.get(cartItem.product_id)!;

      if (!productSnap.exists) {
        throw new InputError(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }

      const product = productSnap.data() as Record<string, unknown> | undefined;

      if (product?.is_active !== true) {
        throw new InputError(
          "One product in your cart is no longer available. Please remove it and add it again."
        );
      }

      const stock = Number(product?.stock ?? 0);
      devLog.log("Checkout inventory validation", {
        productId: cartItem.product_id,
        requestedQuantity: quantities.get(cartItem.product_id),
        serverStock: stock,
        idempotencyReused: false,
      });

      if (!Number.isSafeInteger(stock) || stock < (quantities.get(cartItem.product_id) || quantity)) {
        throw new InputError(
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
          throw new InputError(
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

      if (!Number.isFinite(trustedPrice) || trustedPrice < 0 || trustedPrice > 1_000_000_000) throw new InputError("Product pricing is unavailable.");

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
      throw new InputError(`Minimum order amount is ${minimumOrderAmount} MMK.`);
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
      payment_screenshot_url: trustedReceiptUrl,
      payment_screenshot_file_id: receiptRef?.id ?? null,
      subtotal: computedSubtotal,
      delivery_fee: computedDeliveryFee,
      discount: computedDiscount,
      total: computedTotal,
      status: "Pending",
      stock_restored: false,
      created_at: now,
      updated_at: now,
    };

    for (const [id, quantity] of quantities) {
      transaction.update(adminDb.collection("products").doc(id), {
        stock: Number(products.get(id)!.data()?.stock) - quantity, updated_at: now,
      });
    }
    if (receiptRef) transaction.update(receiptRef, { order_id: orderRef.id, attached_at: now });
    transaction.create(orderRef, orderDoc);

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
      payment_screenshot_url: trustedReceiptUrl,
      payment_screenshot_file_id: receiptRef?.id ?? null,
      amount: computedTotal,
      created_at: now,
      updated_at: now,
    });

    const savedResult = {
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
    if (requestRef) transaction.create(requestRef, { fingerprint, result: savedResult, created_at: now });
    return savedResult;
  });

  /*
   * The payment screenshot is referenced by the order/payment records via
   * `payment_screenshot_file_id`. The temporary upload-ownership record in
   * `payment_uploads/{fileId}` is intentionally KEPT so the authenticated
   * proxy route (/api/checkout/payment-proof) and delete-payment-proof can
   * continue to verify ownership. (Previously it was deleted here, which
   * removed the only server-side ownership record for the uploaded receipt.)
   */

  return result;
}

export async function updateOrderStatus(orderId: string, status: string, actor?: string) {
  if (!validId(orderId) || !orderStatuses.includes(status)) throw new InputError("Invalid order status.");
  const ref = adminDb.collection("orders").doc(orderId);
  return adminDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new InputError("Order not found.", 404);
    const order = snap.data()!;
    if (order.status === status) return { id: orderId, status };
    if (order.status === "Cancelled") throw new InputError("Cancelled orders cannot be reopened after stock restoration.", 409);
    const restorable = new Map<string, number>();
    if (status === "Cancelled" && order.stock_restored !== true) {
      const items = await tx.get(ref.collection("items"));
      items.forEach(item => {
        const d = item.data();
        if (validId(d.product_id) && Number.isSafeInteger(d.quantity) && d.quantity > 0) restorable.set(d.product_id, (restorable.get(d.product_id) || 0) + d.quantity);
      });
    }
    const products = [];
    for (const [id, quantity] of restorable) {
      const productRef = adminDb.collection("products").doc(id);
      const product = await tx.get(productRef);
      if (product.exists) products.push({ ref: productRef, stock: Number(product.data()?.stock || 0) + quantity });
    }
    // All reads complete. The order guard and restored stock commit together.
    for (const product of products) tx.update(product.ref, { stock: product.stock, updated_at: FieldValue.serverTimestamp() });
    tx.update(ref, { status, status_previous: order.status, status_version: Number(order.status_version || 0) + 1, ...(status === "Cancelled" ? { stock_restored: true } : {}), updated_at: FieldValue.serverTimestamp() });
    tx.create(adminDb.collection("audit_logs").doc(), { actor: actor || null, action: "order.status", resource_id: orderId, from: order.status, to: status, created_at: FieldValue.serverTimestamp() });
    return { id: orderId, status };
  });
}

export async function updatePaymentStatus(orderId: string, paymentStatus: string, actor?: string) {
  if (!validId(orderId) || !paymentStatuses.includes(paymentStatus)) throw new InputError("Invalid payment status.");
  const ref = adminDb.collection("orders").doc(orderId);
  return adminDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new InputError("Order not found.", 404);
    const order = snap.data()!;
    if (order.payment_status === paymentStatus) return { id: orderId, payment_status: paymentStatus };
    if (paymentStatus === "Paid" && ["kbzpay", "wavepay", "ayapay", "bank"].includes(order.payment_method) && !order.payment_screenshot_file_id && !order.payment_screenshot_url) throw new InputError("Payment proof is missing.", 409);
    const payments = await tx.get(adminDb.collection("payments").where("order_id", "==", orderId));
    const update = { payment_status: paymentStatus, updated_at: FieldValue.serverTimestamp() };
    tx.update(ref, update);
    payments.forEach(payment => tx.update(payment.ref, update));
    tx.create(adminDb.collection("audit_logs").doc(), { actor: actor || null, action: "payment.status", resource_id: orderId, from: order.payment_status, to: paymentStatus, created_at: FieldValue.serverTimestamp() });
    return { id: orderId, payment_status: paymentStatus };
  });
}
