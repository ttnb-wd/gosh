import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { placeOrder } from "@/lib/firebase/orders-server";

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
      paymentScreenshotFileId: string | null;
      items: Array<{
        product_id: string;
        selected_size: string | null;
        quantity: number;
      }>;
    };

    const data = await placeOrder({
      user_id: user.uid,
      customer_email: user.email || null,
      customer_name: body.customerName,
      phone: body.phone,
      address: body.address,
      city: body.city,
      payment_method: body.paymentMethod,
      payment_account_name: body.paymentAccountName,
      payment_phone: body.paymentPhone,
      payment_account_number: body.paymentAccountNumber,
      payment_screenshot_url: body.paymentScreenshotUrl,
      payment_screenshot_file_id: body.paymentScreenshotFileId,
      items: body.items,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
