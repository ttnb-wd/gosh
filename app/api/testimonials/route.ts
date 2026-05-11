import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      role?: string | null;
      comment?: string;
      rating?: number;
      avatarUrl?: string | null;
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const rating = Number(body.rating ?? 5);

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!body.comment?.trim()) {
      return NextResponse.json({ error: "Comment is required." }, { status: 400 });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        name: body.name.trim(),
        role: body.role?.trim() || null,
        comment: body.comment.trim(),
        rating,
        avatar_url: body.avatarUrl?.trim() || null,
        is_active: true,
      })
      .select("id, name, role, comment, rating, avatar_url")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, testimonial: data });
  } catch {
    return NextResponse.json({ error: "Could not submit your comment." }, { status: 400 });
  }
}
