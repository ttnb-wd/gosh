import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/password-reset
 *
 * Sends a Firebase password-reset email to the provided address.
 *
 * The response is intentionally generic — the same success message is returned
 * whether or not the email address is found — to prevent email enumeration.
 *
 * Requires Firebase Admin SDK (server-only, private credentials are never
 * exposed to the client).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";

    // Basic email validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { success: true, message: "If that email is registered, a password reset link has been sent." },
        { status: 200 }
      );
    }

    // Limit to prevent abuse
    if (email.length > 254) {
      return NextResponse.json(
        { success: true, message: "If that email is registered, a password reset link has been sent." },
        { status: 200 }
      );
    }

    try {
      await adminAuth.generatePasswordResetLink(email);
    } catch (resetError) {
      // Log the real error for debugging, but never expose it.
      const message =
        resetError instanceof Error
          ? `[password-reset] Firebase error for ${email.slice(0, 3)}***: ${resetError.message}`
          : "[password-reset] Unknown Firebase error";

      console.error(message);

      // Still return generic success — do not disclose whether the email exists.
    }

    // Always return the same generic message regardless of outcome.
    return NextResponse.json(
      {
        success: true,
        message:
          "If that email is registered, a password reset link has been sent. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[password-reset] Unexpected error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}