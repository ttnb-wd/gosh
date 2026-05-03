import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCustomerOrderStatusEmail, type OrderEmailData } from "@/lib/email";

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
    const body = (await request.json()) as {
      orderId?: string;
      previousStatus?: string;
      nextStatus?: string;
    };
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!body.orderId || !body.previousStatus || !body.nextStatus || !accessToken) {
      return NextResponse.json({ error: "Missing order status email details." }, { status: 400 });
    }

    const supabase = createAuthenticatedSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, total, status")
      .eq("id", body.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Order not found." }, { status: 404 });
    }

    const result = await sendCustomerOrderStatusEmail(
      order as OrderEmailData,
      body.previousStatus,
      body.nextStatus
    );

    return NextResponse.json({ ok: true, email: result });
  } catch (error) {
    console.error("Order status email route failed:", error);
    return NextResponse.json({ error: "Could not send order status email." }, { status: 500 });
  }
}
