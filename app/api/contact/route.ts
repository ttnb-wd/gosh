import { NextResponse } from "next/server";
import { sendAdminContactEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validateEmail, validateName, validateSubject, validateMessage, sanitizeInput } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      subject?: string;
      message?: string;
      token?: string;
    };

    // Verify Turnstile token
    const verification = await verifyTurnstileToken(body.token || "");
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Security check failed." },
        { status: 400 }
      );
    }

    // Validate full name
    const nameValidation = validateName(body.fullName || '', 'Full name');
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: nameValidation.error },
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

    // Validate subject
    const subjectValidation = validateSubject(body.subject || '');
    if (!subjectValidation.isValid) {
      return NextResponse.json(
        { error: subjectValidation.error },
        { status: 400 }
      );
    }

    // Validate message
    const messageValidation = validateMessage(body.message || '', 10, 5000);
    if (!messageValidation.isValid) {
      return NextResponse.json(
        { error: messageValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(body.fullName!.trim());
    const sanitizedEmail = body.email!.trim().toLowerCase();
    const sanitizedSubject = sanitizeInput(body.subject!.trim());
    const sanitizedMessage = sanitizeInput(body.message!.trim());

    const supabase = getSupabaseAdmin();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: recentCount, error: rateLimitError } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", sanitizedEmail)
      .gt("created_at", oneHourAgo);

    if (rateLimitError) {
      return NextResponse.json(
        { error: "Could not send your message. Please try again or contact us directly." },
        { status: 400 }
      );
    }

    if ((recentCount || 0) >= 3) {
      return NextResponse.json(
        { error: "Too many messages sent recently. Please try again later." },
        { status: 429 }
      );
    }

    const { error } = await supabase.from("contact_messages").insert({
      full_name: sanitizedName,
      email: sanitizedEmail,
      subject: sanitizedSubject,
      message: sanitizedMessage,
      status: "unread",
    });

    if (error) {
      // Don't expose database errors to users
      return NextResponse.json(
        { error: "Could not send your message. Please try again or contact us directly." },
        { status: 400 }
      );
    }

    // Send email notification to admin (non-blocking)
    sendAdminContactEmail({
      fullName: sanitizedName,
      email: sanitizedEmail,
      subject: sanitizedSubject,
      message: sanitizedMessage,
    }).catch((emailError) => {
      // Log email error but don't fail the request
      console.error('Failed to send admin notification email:', emailError instanceof Error ? emailError.message : 'Unknown error');
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log error for debugging but don't expose details
    console.error('Contact form submission error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: "Could not send your message. Please try again later." },
      { status: 500 }
    );
  }
}
