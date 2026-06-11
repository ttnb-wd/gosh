import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
    const user = await requireAdminApiAuth(request);
    const body = (await request.json()) as OrderStatusBody;
    const supabase = getSupabaseAdmin();

    if (body.type === "order") {
      const { data, error } = await supabase.rpc("server_admin_update_order_status", {
        p_actor_id: user.id,
        p_actor_email: user.email || null,
        p_order_id: body.orderId,
        p_status: body.status,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (body.type === "payment") {
      const { data, error } = await supabase.rpc("server_admin_update_payment_status", {
        p_actor_id: user.id,
        p_actor_email: user.email || null,
        p_order_id: body.orderId,
        p_payment_status: body.paymentStatus,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid order status action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order status action failed.";
    const status = message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
