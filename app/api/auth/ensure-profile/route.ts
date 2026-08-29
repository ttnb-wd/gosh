import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Not authenticated." },
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

    // Verify Firebase ID token on the server
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email ?? "";

    const fullName =
      typeof decodedToken.name === "string"
        ? decodedToken.name
        : null;

    const profileRef = adminDb.collection("users").doc(uid);

    const existingProfile = await profileRef.get();

    if (existingProfile.exists) {
      return NextResponse.json({
        profile: {
          id: uid,
          ...existingProfile.data(),
        },
      });
    }

    // New users are customers by default.
    // Admin users will be promoted separately.
    const profile = {
      id: uid,
      email,
      full_name: fullName,
      role: "customer",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await profileRef.set(profile);

    return NextResponse.json({
      profile,
    });
  } catch (error) {
    console.error("Firebase ensure-profile error:", error);

    return NextResponse.json(
      {
        error: "Could not verify or create user profile.",
      },
      { status: 500 }
    );
  }
}