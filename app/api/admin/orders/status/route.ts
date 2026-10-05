import { readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import {
  updateOrderStatus,
  updatePaymentStatus,
} from "@/lib/firebase/orders-server";

type OrderStatusBody =
  | {
      type: "order";
      orderId: string;
      status: string;
    }
  | {
      type: "payment";
      orderId: string;
      paymentStatus: string;
    };

export async function POST(request: Request) {
  try {
    // Same correct Firebase Admin verification used everywhere (e.g. products,
    // imagekit). Reads users/{uid}.role === "admin" server-side (bypasses rules).
    const user = await requireAdminApiAuth(request);

    const body = (await readJson(request, "status")) as OrderStatusBody;

    if (body.type === "order") {
      const data = await updateOrderStatus(body.orderId, body.status, user.uid);
      return NextResponse.json({ data });
    }

    if (body.type === "payment") {
      const data = await updatePaymentStatus(body.orderId, body.paymentStatus, user.uid);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid order status action." }, { status: 400 });
  } catch (error) { return securityError(error); }
}
