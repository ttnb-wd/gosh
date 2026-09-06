import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "firebase-session";
const SESSION_EXPIRES_IN = 1000 * 60 * 60 * 24 * 5; // 5 days

/*
 * Firebase Admin SDK requires Node.js APIs (gRPC). Pin the runtime explicitly
 * for parity with app/api/auth/password-reset/route.ts.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  console.log("[SESSION] POST request received");
  console.log("[SESSION] Environment:", process.env.NODE_ENV);
  
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

    console.log("[SESSION] Token received, length:", idToken.length);
    console.log("[SESSION] Verifying ID token...");

    /*
     * Import Firebase Admin lazily (inside the handler) so that a missing or
     * malformed service-account configuration surfaces as a catchable JSON 500
     * with a safe diagnostic message below, instead of an opaque 500 thrown
     * while this route module is loaded. DELETE still works even if admin
     * initialization is broken.
     */
    const { adminAuth } = await import("@/lib/firebase/admin");

    // Verify Firebase ID token first
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log("[SESSION] ID token verified for user:", decodedToken.uid);
    } catch (verifyError) {
      console.error("[SESSION] Token verification failed:", verifyError);
      if (verifyError instanceof Error) {
        console.error("[SESSION] Verify error name:", verifyError.name);
        console.error("[SESSION] Verify error message:", verifyError.message);
        console.error("[SESSION] Verify error stack:", verifyError.stack);
      }
      throw verifyError;
    }

    console.log("[SESSION] Creating session cookie...");

    // Create secure server-side session cookie
    let sessionCookie;
    try {
      sessionCookie = await adminAuth.createSessionCookie(
        idToken,
        {
          expiresIn: SESSION_EXPIRES_IN,
        }
      );
      console.log("[SESSION] Session cookie created successfully");
    } catch (cookieError) {
      console.error("[SESSION] Session cookie creation failed:", cookieError);
      if (cookieError instanceof Error) {
        console.error("[SESSION] Cookie error name:", cookieError.name);
        console.error("[SESSION] Cookie error message:", cookieError.message);
        console.error("[SESSION] Cookie error stack:", cookieError.stack);
      }
      throw cookieError;
    }

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
    console.error("[SESSION] ============================================");
    console.error("[SESSION] FATAL ERROR - Session creation failed");
    console.error("[SESSION] ============================================");
    console.error("[SESSION] Error object:", error);
    
    // Comprehensive error logging
    if (error instanceof Error) {
      console.error("[SESSION] Error name:", error.name);
      console.error("[SESSION] Error message:", error.message);
      console.error("[SESSION] Error stack:", error.stack);
      
      // Log any additional error properties
      const errorKeys = Object.keys(error);
      if (errorKeys.length > 0) {
        const errorRecord = error as unknown as Record<string, unknown>;
        console.error("[SESSION] Additional error properties:",
          errorKeys.reduce((acc, key) => {
            acc[key] = errorRecord[key];
            return acc;
          }, {} as Record<string, unknown>)
        );
      }
    }
    
    console.error("[SESSION] ============================================");

    return NextResponse.json(
      {
        error: "Could not create Firebase session.",
        details: error instanceof Error ? error.message : "Unknown error",
        errorName: error instanceof Error ? error.name : typeof error,
      },
      { status: 500 } // Changed from 401 to 500 to match production
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