import "server-only";
import { NextResponse } from "next/server";
import { InputError } from "./validation";
// Provider errors can contain URLs, credentials and private request context.
// Only explicitly typed, public boundary errors are serialized.
export function securityError(error: unknown, fallback = "Could not complete the request.") {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message === "Admin access required") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  console.error("Application operation failed.");
  return NextResponse.json({ error: fallback }, { status: 500 });
}
