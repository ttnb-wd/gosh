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

/*
 * Profile reads are de-duplicated per uid and briefly cached so that multiple
 * auth listeners that react to the same sign-in (login flow, Navbar,
 * AdminAuthProvider) share a single Firestore getDoc() instead of opening
 * redundant, competing reads on the same WebChannel. Real Firestore errors
 * are intentionally not cached; callers handle them with their own try/catch.
 */
const PROFILE_CACHE_TTL_MS = 30_000;
const PROFILE_CACHE = new Map<
  string,
  { at: number; value: FirebaseUserProfile | null }
>();
const PROFILE_IN_FLIGHT = new Map<
  string,
  Promise<FirebaseUserProfile | null>
>();

async function fetchUserProfile(
  uid: string
): Promise<FirebaseUserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<FirebaseUserProfile, "id">),
  };
}

export async function getUserProfile(
  uid: string
): Promise<FirebaseUserProfile | null> {
  // 1) Short-TTL cache: reuse an already-resolved profile for this uid (e.g.
  //    Navbar mounts right after the login flow fetched the same profile)
  //    instead of opening a redundant second Firestore read.
  const cached = PROFILE_CACHE.get(uid);
  if (cached && Date.now() - cached.at < PROFILE_CACHE_TTL_MS) {
    return cached.value;
  }

  // 2) In-flight dedup: if another caller is already fetching this same uid
  //    concurrently, return their promise rather than starting a second
  //    independent getDoc().
  const inFlight = PROFILE_IN_FLIGHT.get(uid);
  if (inFlight) {
    return inFlight;
  }

  // Start the real (single) fetch and track it for dedup + cache.
  const promise = fetchUserProfile(uid);
  PROFILE_IN_FLIGHT.set(uid, promise);
  (async () => {
    try {
      const value = await promise;
      PROFILE_CACHE.set(uid, { at: Date.now(), value });
    } catch {
      // Do not cache failures; the caller's try/catch handles rejection.
    } finally {
      if (PROFILE_IN_FLIGHT.get(uid) === promise) {
        PROFILE_IN_FLIGHT.delete(uid);
      }
    }
  })();

  return promise;
}

/**
 * Ensure a user profile document exists for the given uid, creating it with a
 * "customer" role if it does not yet exist.
 */
export async function ensureUserProfile(
  uid: string,
  email: string | null,
  fullName?: string | null
): Promise<FirebaseUserProfile> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

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

  await setDoc(userRef, profile);

  return profile;
}