import { NextResponse } from "next/server";

/*
 * TEMPORARY DIAGNOSTIC ENDPOINT — REMOVE AFTER USE.
 *
 * Purpose: determine whether the production timeout is caused by
 *   (a) Vercel (server) -> Firestore connectivity / Admin SDK initialisation, or
 *   (b) browser (client Firestore SDK) -> Firestore connectivity.
 *
 * It performs EXACTLY ONE harmless Firestore read (`get()`) against a document
 * that does not need to exist, using the SAME production Firebase Admin
 * initialisation (`@/lib/firebase/admin`) as the session-cookie / admin API
 * routes. A read of a non-existent doc both round-trips the RPC and returns
 * without exposing any real data.
 *
 * Nothing secret is logged or returned: project id, booleans, elapsed ms, and
 * error name/message only. No service-account key, token, cookie or credential.
 */
export const runtime = "nodejs";

const SERVER_RPC_TIMEOUT_MS = 10_000;

async function withRpcTimeout<T>(
  op: string,
  promise: Promise<T>
): Promise<T> {
  const startMs = Date.now();
  return Promise.race([
    promise.finally(() => {
      console.log(
        `[DIAG-RPC] ${op} RESOLVED elapsedMs=${Date.now() - startMs}`
      );
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsedMs = Date.now() - startMs;
        console.error(`[DIAG-RPC] ${op} TIMEOUT elapsedMs=${elapsedMs}`);
        reject(new Error(`${op} timed out after ${SERVER_RPC_TIMEOUT_MS}ms`));
      }, SERVER_RPC_TIMEOUT_MS);
    }),
  ]);
}

export async function GET() {
  const out: Record<string, unknown> = {
    projectId: process.env.FIREBASE_PROJECT_ID ?? "unset",
    nodeVersion: process.version,
  };
  const op = "adminDb.collection(_diag).doc(_probe).get";

  try {
    // Lazy import so the bundler/Admin-init errors surface here, catchable.
    const { adminDb } = await import("@/lib/firebase/admin");
    out.adminInitSucceeded = true;

    const startMs = Date.now();
    const snapshot = await withRpcTimeout(op, adminDb.collection("_diag").doc("_probe").get());
    out.readSucceeded = true;
    out.exists = snapshot.exists;
    out.rpcElapsedMs = Date.now() - startMs;
  } catch (error) {
    out.adminInitSucceeded = false;
    if (error instanceof Error) {
      out.errorName = error.name;
      out.errorMessage = error.message;
      console.error(`[DIAG-RPC] ${op} FAILED name=${error.name} message=${error.message}`);
    } else {
      out.errorMessage = String(error);
    }
  }

  return NextResponse.json(out);
}