import "server-only";

import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "./server-auth";
import { getUserProfileAdmin } from "./users-server";

export async function requireFirebaseUser(request: Request) {
  try {
    const user = await verifyFirebaseToken(
      request.headers.get("authorization")
    );

    return {
      user,
      error: null,
    };
  } catch {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }
}

export async function requireFirebaseAdmin(request: Request) {
  const result = await requireFirebaseUser(request);

  if (result.error || !result.user) {
    return result;
  }

  try {
    const profile = await getUserProfileAdmin(result.user.uid);

    if (!profile || profile.role !== "admin") {
      return {
        user: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Forbidden",
          },
          { status: 403 }
        ),
      };
    }

    return {
      user: result.user,
      profile,
      error: null,
    };
  } catch (error) {
    console.error("Firebase admin verification error:", error);

    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unable to verify administrator.",
        },
        { status: 500 }
      ),
    };
  }
}
