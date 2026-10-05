import { readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { deliverOnce } from "@/lib/security/email-once";
import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { sendCustomerOrderStatusEmail, type OrderEmailData } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminApiAuth(request);

    const body = (await readJson(request, "statusEmail")) as {
      orderId: string;
      previousStatus: string;
      nextStatus: string;
    };

    if (!body.orderId || !body.previousStatus || !body.nextStatus) {
      return NextResponse.json({ error: "Missing order status email details." }, { status: 400 });
    }

    const orderSnap = await adminDb.collection("orders").doc(body.orderId).get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const orderData = orderSnap.data() as Record<string, unknown>;
    if (body.nextStatus !== orderData.status || body.previousStatus !== orderData.status_previous) {
      return NextResponse.json({ error: "Order status has changed." }, { status: 409 });
    }

    const order: OrderEmailData = {
      id: orderSnap.id,
      order_number: (orderData.order_number as string) || "",
      customer_name: (orderData.customer_name as string) || "",
      customer_email: (orderData.customer_email as string) || null,
      total: Number(orderData.total ?? 0) || 0,
      status: (orderData.status as string) || null,
    };

    const result = await deliverOnce(`status:${order.id}:${orderData.status_version}`, () => sendCustomerOrderStatusEmail(
      order,
      body.previousStatus,
      body.nextStatus
    ));

    return NextResponse.json({ ok: true, email: result });
  } catch (error) { return securityError(error); }
}
