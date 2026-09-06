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

// Log presence of environment variables (NEVER log actual values)
console.log("[Firebase Admin Init] Environment variables check:", {
  hasProjectId: !!projectId,
  hasClientEmail: !!clientEmail,
  hasPrivateKey: !!privateKeyRaw,
  projectId: projectId, // Safe to log
  clientEmail: clientEmail, // Safe to log
  privateKeyLength: privateKeyRaw?.length,
  privateKeyStartsWith: privateKeyRaw?.substring(0, 30), // First 30 chars are safe (header)
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
// 1. Already has real newlines (local .env file with quotes)
// 2. Has literal \n sequences (production env without quotes)
// 3. Has escaped \\n sequences (some deployment platforms)
let privateKey = privateKeyRaw;

// If the key doesn't contain actual newlines, try to add them
if (!privateKey.includes('\n')) {
  // Replace literal \n with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  console.log("[Firebase Admin Init] Converted literal \\n sequences to newlines");
} else {
  // Also handle the case where it might have literal \\n that needs to become \n
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    console.log("[Firebase Admin Init] Processed escaped \\n sequences");
  }
}

console.log("[Firebase Admin Init] Private key processed:", {
  originalLength: privateKeyRaw.length,
  processedLength: privateKey.length,
  hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
  hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
  newlineCount: (privateKey.match(/\n/g) || []).length,
});

// Validate the private key format
if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
  const error = new Error("FIREBASE_PRIVATE_KEY is missing BEGIN marker. Ensure the key is properly formatted.");
  console.error("[Firebase Admin Init] FATAL:", error.message);
  throw error;
}

if (!privateKey.includes("-----END PRIVATE KEY-----")) {
  const error = new Error("FIREBASE_PRIVATE_KEY is missing END marker. Ensure the key is properly formatted.");
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
