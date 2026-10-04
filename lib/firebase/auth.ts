import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification,
  signInWithEmailAndPassword, signOut, updateProfile, reload, type User,
} from "firebase/auth";
import { auth } from "./config";
import { getEmailActionUrl, verificationPath } from "@/lib/auth/config";

export async function syncUserProfile(user: User) {
  const response = await fetch("/api/auth/ensure-profile", {
    method: "POST", credentials: "include",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (!response.ok) throw new Error("Profile synchronization failed");
  return (await response.json()).profile;
}

export async function sendVerificationEmail(user: User, destination: string | null = "/account") {
  await reload(user);
  if (user.emailVerified) return false;
  await syncUserProfile(user);
  await sendEmailVerification(user, { url: getEmailActionUrl(verificationPath(destination), window.location.origin) });
  return true;
}

export async function completeEmailVerification(user: User): Promise<boolean> {
  await reload(user);
  if (!user.emailVerified) return false;
  await syncUserProfile(user);
  await createServerSession(user);
  return true;
}

export async function signUpWithEmail(email: string, password: string, fullName?: string | null, destination: string | null = "/account") {
  await signOutUser();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: fullName?.trim() || null });
  await sendVerificationEmail(credential.user, destination);
  return credential;
}

export async function signInWithEmail(email: string, password: string) {
  await signOutUser();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createServerSession(user: User) {
  const response = await fetch("/api/auth/session", {
    method: "POST", credentials: "include", cache: "no-store",
    headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) {
    const error = new Error("Session creation failed") as Error & { code?: string };
    error.code = response.status === 401 ? "auth/requires-recent-login" : result.code;
    throw error;
  }
  window.dispatchEvent(new Event("gosh-auth-changed"));
}

export async function signOutUser() {
  // Attempt server cleanup even when client auth has expired. Do not report
  // success or redirect while the cookie is still active.
  const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error("Logout failed");
  await signOut(auth);
  window.dispatchEvent(new Event("gosh-auth-changed"));
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim(), { url: getEmailActionUrl("/login", window.location.origin) });
  } catch (error) {
    // Generic success for unknown accounts, including projects without enumeration protection.
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
}

export function getFirebaseUser(): User | null { return auth.currentUser; }
