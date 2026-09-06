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

/*
 * TEMPORARY SAFE DIAGNOSTIC LOGGING (client-side, browser console).
 *
 * Logs ONLY non-sensitive metadata: operation name, Firestore path, timing,
 * the Firebase project id, and error name/code/message. NEVER logs tokens,
 * cookies, private keys, or full credentials.
 *
 * NOTE: `dev-log.ts` is a no-op in production builds, so to be able to observe
 * production failures we use raw console.* calls here, clearly prefixed with
 * `[FIRESTORE-DIAG]`. Remove this block after diagnosis.
 */
const DIAG_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "unknown";

function diagStart(op: string, path: string): number {
  const startMs = Date.now();
  console.log(
    `[FIRESTORE-DIAG] ${op} START path=${path} projectId=${DIAG_PROJECT_ID} startMs=${startMs}`
  );
  return startMs;
}

function diagEnd(op: string, startMs: number) {
  const elapsedMs = Date.now() - startMs;
  console.log(`[FIRESTORE-DIAG] ${op} END elapsedMs=${elapsedMs}`);
}

function diagFail(op: string, startMs: number, error: unknown) {
  const elapsedMs = Date.now() - startMs;
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "n/a";
  console.error(
    `[FIRESTORE-DIAG] ${op} FAILED elapsedMs=${elapsedMs} name=${name} code=${code} message=${message}`
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = FIRESTORE_TIMEOUT_MS,
  op = "firestore-op",
  path = "?"
): Promise<T> {
  const startMs = Date.now();
  console.log(
    `[FIRESTORE-DIAG] ${op} WRAP START path=${path} timeoutMs=${timeoutMs}`
  );
  return Promise.race([
    promise.finally(() => {
      console.log(
        `[FIRESTORE-DIAG] ${op} RESOLVED elapsedMs=${Date.now() - startMs}`
      );
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsedMs = Date.now() - startMs;
        console.error(
          `[FIRESTORE-DIAG] ${op} TIMEOUT path=${path} elapsedMs=${elapsedMs}`
        );
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
  const op = "getUserProfile.getDoc";
  const path = `users/${uid}`;
  const startMs = diagStart(op, path);

  try {
    const snapshot = await withTimeout(
      getDoc(userRef),
      FIRESTORE_TIMEOUT_MS,
      op,
      path
    );

    diagEnd(op, startMs);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<FirebaseUserProfile, "id">),
    };
  } catch (error) {
    diagFail(op, startMs, error);
    throw error;
  }
}

export async function ensureUserProfile(
  uid: string,
  email: string | null,
  fullName?: string | null
): Promise<FirebaseUserProfile> {
  const userRef = doc(db, "users", uid);
  const op = "ensureUserProfile.setDoc";
  const path = `users/${uid}`;
  const startMs = diagStart(op, path);

  try {
    const snapshot = await withTimeout(
      getDoc(userRef),
      FIRESTORE_TIMEOUT_MS,
      `${op}.getDoc`,
      path
    );

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

    await withTimeout(setDoc(userRef, profile), FIRESTORE_TIMEOUT_MS, op, path);

    return profile;
  } catch (error) {
    diagFail(op, startMs, error);
    throw error;
  } finally {
    diagEnd(op, startMs);
  }
}
