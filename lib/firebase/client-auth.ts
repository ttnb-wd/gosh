"use client";

import { auth } from "./config";

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken();
}

export async function getFirebaseAuthorizationHeader(): Promise<
  Record<string, string>
> {
  const token = await getFirebaseIdToken();

  if (!token) {
    throw new Error("You must be signed in.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}