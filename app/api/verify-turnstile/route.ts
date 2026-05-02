import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const verification = await verifyTurnstileToken(body.token || "");

    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Security check failed." }, { status: 400 });
  }
}
