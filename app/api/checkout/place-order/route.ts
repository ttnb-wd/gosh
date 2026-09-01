import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { checkRateLimit, createRateLimitId } from "@/lib/rateLimit";
import { placeOrder } from "@/lib/firebase/orders-server";

const ALLOWED_PAYMENT_METHODS = new Set([
  "cod",
  "kbzpay",
  "wavepay",
  "ayapay",
  "bank",
]);

const MAX_ITEMS = 100;

function isBoundedString(
  value: unknown,
  maxLength: number
): value is string {
  return typeof value === "string" && value.trim().length <= maxLength;
}

type PlaceOrderBody = {
  customerName?: unknown;
  phone?: unknown;
  address?: unknown;
  city?: unknown;
  paymentMethod?: unknown;
  paymentAccountName?: unknown;
  paymentPhone?: unknown;
  paymentAccountNumber?: unknown;
  paymentScreenshotUrl?: unknown;
  paymentScreenshotFileId?: unknown;
  items?: unknown;
};

type ValidatedItem = {
  product_id: string;
  selected_size: string | null;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please login or create an account to place your order." },
        { status: 401 }
      );
    }

    /*
     * Per-user rate limit to discourage duplicate submissions, order spam and
     * request flooding. Best-effort in-memory limiting, consistent with the
     * rest of the codebase; the window is generous so legitimate customers are
     * unaffected.
     */
    const rateLimit = checkRateLimit({
      identifier: createRateLimitId(user.uid, "place-order"),
      maxRequests: 10,
      windowSeconds: 600, // 10 orders per 10 minutes
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many orders. Please try again later." },
        { status: 429 }
      );
    }

    let body: PlaceOrderBody;

    try {
      body = (await request.json()) as PlaceOrderBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    /*
     * Server-side input validation. Sensitive money/stock/payment-status fields
     * are NOT accepted from the client — they are recomputed from Firestore
     * (products, site_settings) inside placeOrder().
     */
    if (
      !isBoundedString(body.customerName, 100) ||
      body.customerName.trim().length < 2
    ) {
      return NextResponse.json(
        { error: "Name is required (2-100 characters)." },
        { status: 400 }
      );
    }

    if (!isBoundedString(body.phone, 20)) {
      return NextResponse.json(
        { error: "Phone is required (max 20 characters)." },
        { status: 400 }
      );
    }

    if (!isBoundedString(body.address, 500)) {
      return NextResponse.json(
        { error: "Address is required (max 500 characters)." },
        { status: 400 }
      );
    }

    if (!isBoundedString(body.city, 100)) {
      return NextResponse.json(
        { error: "City is required (max 100 characters)." },
        { status: 400 }
      );
    }

    if (
      typeof body.paymentMethod !== "string" ||
      !ALLOWED_PAYMENT_METHODS.has(body.paymentMethod)
    ) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 }
      );
    }

    [
      [body.paymentAccountName, 200, "Payment account name"],
      [body.paymentPhone, 50, "Payment phone"],
      [body.paymentAccountNumber, 100, "Payment account number"],
      [body.paymentScreenshotUrl, 500, "Invalid payment screenshot URL"],
      [body.paymentScreenshotFileId, 200, "Invalid payment screenshot reference"],
    ].forEach(([value, max, label]) => {
      if (
        value !== null &&
        value !== undefined &&
        !isBoundedString(value, max as number)
      ) {
        throw new Error(`${label as string} is too long.`);
      }
    });

    const items: ValidatedItem[] = [];

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Your bag is empty." },
        { status: 400 }
      );
    }

    if (body.items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: "Too many items in the order." },
        { status: 400 }
      );
    }

    for (const raw of body.items) {
      if (!raw || typeof raw !== "object") {
        return NextResponse.json(
          { error: "Invalid order item." },
          { status: 400 }
        );
      }

      const item = raw as {
        product_id?: unknown;
        selected_size?: unknown;
        quantity?: unknown;
      };

      if (
        typeof item.product_id !== "string" ||
        !item.product_id.trim() ||
        item.product_id.trim().length > 100
      ) {
        return NextResponse.json(
          { error: "Invalid product in the order." },
          { status: 400 }
        );
      }

      if (
        item.selected_size !== null &&
        item.selected_size !== undefined &&
        (typeof item.selected_size !== "string" ||
          item.selected_size.length > 100)
      ) {
        return NextResponse.json(
          { error: "Invalid product size in the order." },
          { status: 400 }
        );
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json(
          { error: "Invalid product quantity." },
          { status: 400 }
        );
      }

      items.push({
        product_id: item.product_id.trim(),
        selected_size:
          typeof item.selected_size === "string" ? item.selected_size : null,
        quantity,
      });
    }

    const data = await placeOrder({
      user_id: user.uid,
      customer_email: user.email || null,
      customer_name: body.customerName.trim(),
      phone: body.phone.trim(),
      address: body.address.trim(),
      city: body.city.trim(),
      payment_method: body.paymentMethod as string,
      payment_account_name:
        body.paymentAccountName == null
          ? null
          : (body.paymentAccountName as string),
      payment_phone:
        body.paymentPhone == null ? null : (body.paymentPhone as string),
      payment_account_number:
        body.paymentAccountNumber == null
          ? null
          : (body.paymentAccountNumber as string),
      payment_screenshot_url:
        body.paymentScreenshotUrl == null
          ? null
          : (body.paymentScreenshotUrl as string),
      payment_screenshot_file_id:
        body.paymentScreenshotFileId == null
          ? null
          : (body.paymentScreenshotFileId as string),
      items,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    // Only pass through the known, user-facing business messages from placeOrder().
    // Anything else is an unexpected internal error (e.g. a Firestore/transaction
    // failure) — log it for server diagnostics but never surface it to the user.
    const knownUserErrors = [
      "must include at least one item",
      "Quantity is too high",
      "One product in your cart is no longer available",
      "left in stock",
      "Selected decant size is no longer available",
    ];

    if (
      message &&
      knownUserErrors.some((known) => message.includes(known))
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Place order unexpected error:", error);

    return NextResponse.json(
      { error: "Could not place order. Please try again." },
      { status: 500 }
    );
  }
}
