import { limitRequest } from "@/lib/security/abuse";
import { readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  const limited = await limitRequest(request, "turnstile", 30);
  if (limited) return limited;
  try {
    const body = (await readJson(request, "turnstile")) as { token?: string };
    const verification = await verifyTurnstileToken(body.token || "");

    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) { return securityError(error); }
}
