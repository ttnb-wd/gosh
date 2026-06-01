import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp, createRateLimitId } from "@/lib/rateLimit";
import { validateName, validateMessage, sanitizeInput } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    // Rate limiting: 3 testimonials per hour per IP
    const clientIp = getClientIp(request.headers);
    const rateLimitId = createRateLimitId(clientIp, 'testimonial');
    const rateLimit = checkRateLimit({
      identifier: rateLimitId,
      maxRequests: 3,
      windowSeconds: 3600, // 1 hour
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      role?: string | null;
      comment?: string;
      rating?: number;
      avatarUrl?: string | null;
      turnstileToken?: string;
    };

    // Verify Turnstile token
    if (!body.turnstileToken) {
      return NextResponse.json(
        { error: "Security check is required." },
        { status: 400 }
      );
    }

    const turnstileResult = await verifyTurnstileToken(body.turnstileToken);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || "Security check failed." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 500 }
      );
    }

    // Validate name
    const nameValidation = validateName(body.name || '', 'Name');
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate comment
    const commentValidation = validateMessage(body.comment || '', 10, 1000);
    if (!commentValidation.isValid) {
      return NextResponse.json(
        { error: commentValidation.error },
        { status: 400 }
      );
    }

    // Validate rating
    const rating = Number(body.rating ?? 5);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(body.name!.trim());
    const sanitizedRole = body.role?.trim() ? sanitizeInput(body.role.trim()) : null;
    const sanitizedComment = sanitizeInput(body.comment!.trim());

    // Validate role length if provided
    if (sanitizedRole && sanitizedRole.length > 100) {
      return NextResponse.json(
        { error: "Role is too long (max 100 characters)." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        name: sanitizedName,
        role: sanitizedRole,
        comment: sanitizedComment,
        rating,
        avatar_url: body.avatarUrl?.trim() || null,
        is_active: false, // Admin must approve
      })
      .select("id, name, role, comment, rating, avatar_url")
      .single();

    if (error) {
      // Don't expose database errors to users
      return NextResponse.json(
        { error: "Could not submit your testimonial. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, testimonial: data });
  } catch (error) {
    // Log error for debugging but don't expose details
    console.error('Testimonial submission error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: "Could not submit your testimonial. Please try again." },
      { status: 500 }
    );
  }
}
