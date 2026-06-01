import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminContactEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validateEmail, validateName, validateSubject, validateMessage, sanitizeInput } from "@/lib/validation";

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.rpc("submit_contact_message", {
      p_full_name: sanitizedName,
      p_email: sanitizedEmail,
      p_subject: sanitizedSubject,
      p_message: sanitizedMessage,
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
