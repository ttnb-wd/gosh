import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminNewOrderEmail, sendCustomerOrderConfirmationEmail, type OrderEmailData } from "@/lib/email";

const createAuthenticatedSupabase = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!body.orderId || !accessToken) {
      return NextResponse.json({ error: "Missing order or session." }, { status: 400 });
    }

    const supabase = createAuthenticatedSupabase(accessToken);
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(product_name, selected_size, quantity, price)")
      .eq("id", body.orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: error?.message || "Order not found." }, { status: 404 });
    }

    const orderEmail = order as OrderEmailData;
    const [adminResult, customerResult] = await Promise.all([
      sendAdminNewOrderEmail(orderEmail),
      sendCustomerOrderConfirmationEmail(orderEmail),
    ]);

    return NextResponse.json({
      ok: true,
      adminEmail: adminResult,
      customerEmail: customerResult,
    });
  } catch (error) {
    console.error("Order email route failed:", error);
    return NextResponse.json({ error: "Could not send order email." }, { status: 500 });
  }
}
