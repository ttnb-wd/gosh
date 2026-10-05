import "server-only";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
export async function limitRequest(request: Request, scope: string, maxRequests = 30, windowSeconds = 600, uid?: string) {
  const result = await checkRateLimit({ identifier: `${scope}:${uid || getClientIp(request.headers)}`, maxRequests, windowSeconds });
  return result.success ? null : NextResponse.json({ error: "Too many requests or service temporarily unavailable. Please try again later." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))) } });
}
