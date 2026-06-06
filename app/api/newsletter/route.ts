import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp, createRateLimitId } from "@/lib/rateLimit";
import { validateEmail } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 subscriptions per hour per IP
    const clientIp = getClientIp(request.headers);
    const rateLimitId = createRateLimitId(clientIp, 'newsletter');
    const rateLimit = checkRateLimit({
      identifier: rateLimitId,
      maxRequests: 5,
      windowSeconds: 3600, // 1 hour
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: string; token?: string };

    // Verify Turnstile token
    const verification = await verifyTurnstileToken(body.token || "");
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Security check failed." },
        { status: 400 }
      );
    }

    // Validate email
    const emailValidation = validateEmail(body.email || '');
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email: body.email!.trim().toLowerCase(),
          status: "subscribed",
          source: "vip_club",
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (error) {
      // Don't expose database errors to users
      return NextResponse.json(
        { error: "Could not subscribe. Please try again or contact support." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log error for debugging but don't expose details
    console.error('Newsletter subscription error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again later." },
      { status: 500 }
    );
  }
}
