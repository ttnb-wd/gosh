import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      subject?: string;
      message?: string;
      token?: string;
    };
    const verification = await verifyTurnstileToken(body.token || "");

    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.rpc("submit_contact_message", {
      p_full_name: (body.fullName || "").trim(),
      p_email: (body.email || "").trim(),
      p_subject: (body.subject || "").trim(),
      p_message: (body.message || "").trim(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send your message." }, { status: 400 });
  }
}
