import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "firebase-session";
const SESSION_EXPIRES_IN = 1000 * 60 * 60 * 24 * 5; // 5 days

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 401 }
      );
    }

    const idToken = authorization.substring(7).trim();

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 401 }
      );
    }

    // Verify Firebase ID token first
    await adminAuth.verifyIdToken(idToken);

    // Create secure server-side session cookie
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

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

    return response;
  } catch (error) {
    console.error("Firebase session creation failed:", error);

    return NextResponse.json(
      {
        error: "Could not create Firebase session.",
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