import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ENHANCED DIAGNOSTIC LOGGING FOR PRODUCTION DEBUGGING
console.log("[Firebase Admin Init] Starting initialization...");
console.log("[Firebase Admin Init] NODE_ENV:", process.env.NODE_ENV);

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

// Log presence of environment variables (NEVER log actual values or key parts)
console.log("[Firebase Admin Init] Environment variables check:", {
  hasProjectId: !!projectId,
  hasClientEmail: !!clientEmail,
  hasPrivateKey: !!privateKeyRaw,
  projectId: projectId, // Safe to log
  clientEmail: clientEmail, // Safe to log
  privateKeyLength: privateKeyRaw?.length,
  privateKeyContainsBegin: !!privateKeyRaw?.includes(
    "-----BEGIN PRIVATE KEY-----"
  ),
});

if (!projectId) {
  const error = new Error("Missing FIREBASE_PROJECT_ID environment variable");
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

if (!clientEmail) {
  const error = new Error("Missing FIREBASE_CLIENT_EMAIL environment variable");
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

if (!privateKeyRaw) {
  const error = new Error("Missing FIREBASE_PRIVATE_KEY environment variable");
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

// Handle multiple formats of private key encoding:
// 1. Multi-line PEM with real newline characters.
// 2. Single line with literal \n sequences (quoted .env value).
// 3. Double/triple escaped \\n sequences (some deployment platforms).
// 4. Surrounded by stray whitespace and/or a pair of quotes (very common
//    when the value is copied out of a JSON service-account file).
//
// IMPORTANT: creating a session cookie requires signing an OAuth2 assertion
// with this private key, so a malformed key makes verifyIdToken() succeed but
// createSessionCookie() throw (HTTP 500). Stripping quotes / decoding escapes
// fixes the most common real-world production failures.
let privateKey = privateKeyRaw;

// 1) Trim leading/trailing whitespace (incl. accidental newlines).
privateKey = privateKey.trim();

// 2) Strip a single pair of surrounding single or double quotes. A PEM key
//    always begins with "-----BEGIN", so before that is never legitimate.
if (
  privateKey.length >= 2 &&
  ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'")))
) {
  privateKey = privateKey.slice(1, -1).trim();
}

// 3) Convert escaped newline sequences (`\n`, `\\n`, `\\\n`, ...) into real
//    newlines. Safe because PEM bodies are base64 and never contain a literal
//    backslash immediately followed by the letter "n".
privateKey = privateKey.replace(/\\+n/g, "\n");

console.log("[Firebase Admin Init] Private key processed:", {
  originalLength: privateKeyRaw.length,
  processedLength: privateKey.length,
  hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
  hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
  newlineCount: (privateKey.match(/\n/g) || []).length,
});

// Validate the private key format. `startsWith` (not just `includes`) catches
// stray leading characters such as quotes or whitespace.
if (!privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
  const error = new Error(
    "FIREBASE_PRIVATE_KEY does not start with '-----BEGIN PRIVATE KEY-----'. It may contain stray surrounding characters (quotes/whitespace) or be malformed."
  );
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

if (!privateKey.includes("-----END PRIVATE KEY-----")) {
  const error = new Error(
    "FIREBASE_PRIVATE_KEY is missing '-----END PRIVATE KEY-----' marker. Ensure the key is complete and properly formatted."
  );
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

let adminApp;

try {
  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    console.log("[Firebase Admin Init] Reusing existing Firebase Admin app (found", existingApps.length, "app(s))");
    adminApp = existingApps[0];
  } else {
    console.log("[Firebase Admin Init] Initializing new Firebase Admin app");
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("[Firebase Admin Init] Firebase Admin app initialized successfully");
  }
} catch (error) {
  console.error("[Firebase Admin Init] ============================================");
  console.error("[Firebase Admin Init] FATAL: Failed to initialize Firebase Admin");
  console.error("[Firebase Admin Init] ============================================");
  console.error("[Firebase Admin Init] Error:", error);
  if (error instanceof Error) {
    console.error("[Firebase Admin Init] Error name:", error.name);
    console.error("[Firebase Admin Init] Error message:", error.message);
    console.error("[Firebase Admin Init] Error stack:", error.stack);
    
    // Check for common Firebase Admin initialization errors
    if (error.message.includes("private key")) {
      console.error("[Firebase Admin Init] HINT: Check that FIREBASE_PRIVATE_KEY is properly formatted");
      console.error("[Firebase Admin Init] HINT: In production, ensure the key has literal \\n sequences, not actual newlines");
      console.error("[Firebase Admin Init] HINT: The key should start with -----BEGIN PRIVATE KEY-----\\n");
    }
  }
  console.error("[Firebase Admin Init] ============================================");
  throw error;
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

console.log("[Firebase Admin Init] Exports created successfully");

export default adminApp;
