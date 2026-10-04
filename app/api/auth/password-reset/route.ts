import { NextResponse } from "next/server";
import { getEmailActionUrl } from "@/lib/auth/config";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import devLog from "@/lib/dev-log";
import { validateEmail } from "@/lib/validation";
import { isSameOrigin } from "@/lib/auth/session";
import { checkRateLimit, createRateLimitId, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * POST /api/auth/password-reset
 *
 * Sends a Firebase password-reset email to the provided address.
 *
 * The response is intentionally generic — the same success message is returned
 * whether or not the email address is found — to prevent email enumeration.
 *
 * Uses Firebase built-in email delivery; no Admin link or email provider.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    /*
     * Rate limit (5 per hour per IP) to prevent password-reset email abuse /
     * spam. Best-effort in-memory limiting on serverless.
     */
    const rateLimit = await checkRateLimit({
      identifier: createRateLimitId(
        getClientIp(request.headers),
        "password-reset"
      ),
      maxRequests: 5,
      windowSeconds: 3600,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";

    // Basic email validation
    if (!validateEmail(email).isValid) {
      return NextResponse.json(
        { success: true, message: "If an account exists for this email, we’ve sent password reset instructions." },
        { status: 200 }
      );
    }

    // Limit to prevent abuse
    if (email.length > 254) {
      return NextResponse.json(
        { success: true, message: "If an account exists for this email, we’ve sent password reset instructions." },
        { status: 200 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
    // Firebase's OOB endpoint sends its own email; Admin link generation does not.
    const result = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email, continueUrl: getEmailActionUrl("/login", new URL(request.url).origin) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) {
      const data = await result.json().catch(() => ({}));
      const code = data?.error?.message;
      if (code !== "EMAIL_NOT_FOUND") {
        return NextResponse.json({ error: code === "TOO_MANY_ATTEMPTS_TRY_LATER" ? "Too many requests. Please try again later." : "Password recovery is temporarily unavailable." }, { status: code === "TOO_MANY_ATTEMPTS_TRY_LATER" ? 429 : 503 });
      }
    }

    // Always return the same generic message regardless of outcome.
    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists for this email, we’ve sent password reset instructions. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch (error) {
    devLog.warn("Password recovery request could not be completed.");

    return NextResponse.json(
      { success: false, error: getAuthErrorMessage(error) },
      { status: 500 }
    );
  }
}