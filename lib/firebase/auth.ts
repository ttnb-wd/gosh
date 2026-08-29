import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "./config";
import { ensureUserProfile } from "./users";

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string | null
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await ensureUserProfile(
    credential.user.uid,
    credential.user.email,
    fullName
  );

  return credential;
}

export async function signInWithEmail(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function sendPasswordReset(
  email: string
) {
  return sendPasswordResetEmail(auth, email);
}

export function getFirebaseUser(): User | null {
  return auth.currentUser;
}
