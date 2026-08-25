import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const email = user.email ?? "";
    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;

    const { data: existingProfile, error: readError } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: "Could not load user profile." }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email,
        full_name: fullName,
        role: "customer",
      })
      .select("id, email, role, full_name")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Could not create user profile." }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Could not verify user profile." }, { status: 500 });
  }
}
