import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { adminDb } from "@/lib/firebase/admin";



export async function checkAdminAuth() {
  try {
    const decodedClaims = await getCurrentUser();
    if (!decodedClaims) return { isAdmin: false, user: null, profile: null };

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


      return {
        isAdmin: false,
        user: null,
        profile,
      };
    }

    /*
     * Everything is valid.
     */


    return {
      isAdmin: true,
      user: {
        uid,
        email: decodedClaims.email ?? null,
      },
      profile,
    };
  } catch {




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
