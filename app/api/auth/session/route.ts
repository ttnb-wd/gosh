import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "firebase-session";
const SESSION_EXPIRES_IN = 1000 * 60 * 60 * 24 * 5; // 5 days

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      console.error("[SESSION] Missing Authorization header");
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 401 }
      );
    }

    const idToken = authorization.substring(7).trim();

    if (!idToken) {
      console.error("[SESSION] Empty ID token");
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 401 }
      );
    }

    console.log("[SESSION] Verifying ID token...");

    // Verify Firebase ID token first
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    console.log("[SESSION] ID token verified for user:", decodedToken.uid);

    console.log("[SESSION] Creating session cookie...");

    // Create secure server-side session cookie
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    console.log("[SESSION] Session cookie created successfully");

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: SESSION_EXPIRES_IN / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    console.log("[SESSION] Response prepared with cookie, maxAge:", SESSION_EXPIRES_IN / 1000, "seconds");

    return response;
  } catch (error) {
    console.error("[SESSION] Firebase session creation failed:", error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("[SESSION] Error name:", error.name);
      console.error("[SESSION] Error message:", error.message);
    }

    return NextResponse.json(
      {
        error: "Could not create Firebase session.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}