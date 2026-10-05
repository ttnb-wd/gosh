import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { securityError } from "@/lib/security/responses";
export async function GET(request: Request) {
  try { await requireAdminApiAuth(request); return NextResponse.json({ error: "Use the authenticated image upload endpoint." }, { status: 410 }); }
  catch (error) { return securityError(error); }
}
