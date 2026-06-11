import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please login or create an account to place your order." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      customerName: string;
      phone: string;
      address: string;
      city: string;
      paymentMethod: string;
      paymentAccountName: string | null;
      paymentPhone: string | null;
      paymentAccountNumber: string | null;
      paymentScreenshotUrl: string | null;
      items: Array<{
        product_id: string;
        selected_size: string | null;
        quantity: number;
      }>;
    };
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("server_place_order", {
      p_actor_id: user.id,
      p_actor_email: user.email || null,
      p_customer_name: body.customerName,
      p_phone: body.phone,
      p_address: body.address,
      p_city: body.city,
      p_payment_method: body.paymentMethod,
      p_payment_account_name: body.paymentAccountName,
      p_payment_phone: body.paymentPhone,
      p_payment_account_number: body.paymentAccountNumber,
      p_payment_screenshot_url: body.paymentScreenshotUrl,
      p_items: body.items,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
