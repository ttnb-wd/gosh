import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKeyRaw) {
  throw new Error("Firebase Admin configuration is missing.");
}
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== projectId) {
  throw new Error("Firebase client and server project IDs must match.");
}

// Preserve support for Vercel PEM values with surrounding quotes and escaped
// newlines. Never log credential values, private-key metadata, or token data.
let privateKey = privateKeyRaw.trim();
if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1).trim();
}
privateKey = privateKey.replace(/\\+n/g, "\n");
if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")) {
  throw new Error("Firebase Admin private key is malformed.");
}

const adminApp = getApps().some((app) => app.name === "[DEFAULT]")
  ? getApp()
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export default adminApp;
