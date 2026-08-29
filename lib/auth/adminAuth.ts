import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "firebase-session";

export async function checkAdminAuth() {
  try {
    const cookieStore = await cookies();

    const sessionCookie = cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (!sessionCookie) {
      return {
        isAdmin: false,
        user: null,
        profile: null,
      };
    }

    /*
     * Verify the Firebase server session cookie.
     */
    const decodedClaims =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    const uid = decodedClaims.uid;

    /*
     * IMPORTANT:
     *
     * The client-side auth/profile system uses:
     *
     * users/{uid}
     *
     * Therefore the server-side admin check MUST use
     * the same collection.
     */
    const profileSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!profileSnapshot.exists) {
      console.warn(
        "[ADMIN AUTH] User profile not found:",
        uid
      );

      return {
        isAdmin: false,
        user: null,
        profile: null,
      };
    }

    const profile = profileSnapshot.data();

    /*
     * Admin access is controlled by the Firestore role.
     */
    if (profile?.role !== "admin") {
      console.warn(
        "[ADMIN AUTH] User is not an admin:",
        uid
      );

      return {
        isAdmin: false,
        user: null,
        profile,
      };
    }

    /*
     * Everything is valid.
     */
    console.log(
      "[ADMIN AUTH] Admin session verified:",
      uid
    );

    return {
      isAdmin: true,
      user: {
        uid,
        email: decodedClaims.email ?? null,
      },
      profile,
    };
  } catch (error) {
    console.error(
      "[ADMIN AUTH] Session verification failed:",
      error
    );

    return {
      isAdmin: false,
      user: null,
      profile: null,
    };
  }
}

export async function requireAdminAuth() {
  const result = await checkAdminAuth();

  if (!result.isAdmin) {
    return null;
  }

  return result.user;
}

export async function requireAdmin() {
  const result = await checkAdminAuth();

  /*
   * Only protected admin routes call requireAdmin().
   *
   * /admin/login is outside the protected layout.
   */
  if (!result.isAdmin) {
    redirect("/admin/login");
  }

  return {
    uid: result.user!.uid,
    email: result.user!.email,
    profile: result.profile,
  };
}
