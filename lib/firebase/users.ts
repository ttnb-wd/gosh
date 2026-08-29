import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./config";

export type FirebaseUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "customer";
  created_at?: unknown;
  updated_at?: unknown;
};

const FIRESTORE_TIMEOUT_MS = 8000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = FIRESTORE_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Firestore connection timed out. Please check your internet connection or Firebase Firestore availability."
          )
        );
      }, timeoutMs);
    }),
  ]);
}

export async function getUserProfile(
  uid: string
): Promise<FirebaseUserProfile | null> {
  const userRef = doc(db, "users", uid);

  const snapshot = await withTimeout(getDoc(userRef));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<FirebaseUserProfile, "id">),
  };
}

export async function ensureUserProfile(
  uid: string,
  email: string | null,
  fullName?: string | null
): Promise<FirebaseUserProfile> {
  const userRef = doc(db, "users", uid);

  const snapshot = await withTimeout(getDoc(userRef));

  if (snapshot.exists()) {
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<FirebaseUserProfile, "id">),
    };
  }

  const profile: FirebaseUserProfile = {
    id: uid,
    email,
    full_name: fullName ?? null,
    role: "customer",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await withTimeout(setDoc(userRef, profile));

  return profile;
}
