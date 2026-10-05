import { readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { deliverOnce } from "@/lib/security/email-once";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkAdminApiAuth } from "@/lib/auth/apiAuth";
import { checkRateLimit, createRateLimitId } from "@/lib/rateLimit";
import { sendAdminNewOrderEmail, sendCustomerOrderConfirmationEmail, type OrderEmailData } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    /*
     * This route sends transactional emails (customer confirmation + admin
     * notification). It must never be callable without a verified identity —
     * otherwise anyone could trigger email sends to real customers for any
     * known order id. The order owner (the customer who placed it) is
     * authenticated when the checkout flow calls this endpoint; admins are
     * also allowed (e.g. re-sending from an admin context).
     */
    const auth = await checkAdminApiAuth(request);

    if (!auth.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    /*
     * Rate limit per user to prevent a customer from repeatedly re-triggering
     * the admin/order emails (inbox flooding). Distributed Redis limiting; production fails closed if unavailable.
     */
    const rateLimit = await checkRateLimit({
      identifier: createRateLimitId(auth.user.uid, "order-email"),
      maxRequests: 30,
      windowSeconds: 600, // 30 per 10 minutes
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await readJson(request, "orderEmail")) as { orderId?: string };

    if (!body.orderId || typeof body.orderId !== "string" || body.orderId.length > 200) {
      return NextResponse.json({ error: "Missing order." }, { status: 400 });
    }

    const orderSnap = await adminDb.collection("orders").doc(body.orderId).get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const orderData = orderSnap.data() as Record<string, unknown>;

    /*
     * Only the order owner or an admin may trigger emails for an order.
     * This closes the gap where any caller could email-confirm another
     * customer's order or spam the admin inbox.
     */
    const isOwner = orderData.user_id === auth.user.uid;

    if (!isOwner && !auth.isAdmin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const itemsSnap = await orderSnap.ref.collection("items").get();

    const orderItems = itemsSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        product_name: (d.product_name as string) || "",
        selected_size: (d.selected_size as string) || null,
        quantity: Number(d.quantity ?? 0) || 0,
        price: Number(d.price ?? 0) || 0,
      };
    });

    const order: OrderEmailData = {
      id: orderSnap.id,
      order_number: (orderData.order_number as string) || "",
      customer_name: (orderData.customer_name as string) || "",
      customer_email: (orderData.customer_email as string) || null,
      phone: (orderData.phone as string) || null,
      address: (orderData.address as string) || null,
      city: (orderData.city as string) || null,
      payment_method: (orderData.payment_method as string) || null,
      payment_status: (orderData.payment_status as string) || null,
      status: (orderData.status as string) || null,
      total: Number(orderData.total ?? 0) || 0,
      order_items: orderItems,
    };

    const [adminResult, customerResult] = await Promise.all([
      deliverOnce(`created:admin:${order.id}`, () => sendAdminNewOrderEmail(order)),
      deliverOnce(`created:customer:${order.id}`, () => sendCustomerOrderConfirmationEmail(order)),
    ]);

    return NextResponse.json({
      ok: true,
      adminEmail: adminResult,
      customerEmail: customerResult,
    });
  } catch (error) { return securityError(error); }
}
