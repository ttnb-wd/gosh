import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

// Opt in only after Console registration. Localhost remains unaffected.
const runtime = globalThis as typeof globalThis & { __goshAppCheck?: boolean };
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY &&
    !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname) && !runtime.__goshAppCheck) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY), isTokenAutoRefreshEnabled: true });
  runtime.__goshAppCheck = true;
}
export const auth = getAuth(app);

// Firebase retains its app through Fast Refresh, but this module is re-evaluated.
// Keep the configured instance for that app instead of rebuilding cache options.
const firestoreRuntime = globalThis as typeof globalThis & {
  __goshFirestoreByApp?: WeakMap<typeof app, ReturnType<typeof initializeFirestore>>;
};
const firestoreByApp = firestoreRuntime.__goshFirestoreByApp ??= new WeakMap();

export const db = firestoreByApp.get(app) ?? initializeFirestore(app, {
  /*
   * Do NOT set experimentalForceLongPolling here.
   *
   * The Firebase JS SDK's default browser transport for Firestore is the
   * WebChannel (gRPC-Web) streaming transport to https://firestore.googleapis.com.
   * Forcing long-polling overrides that default and opens long-lived HTTP
   * long-poll connections that can stall in a normal browser, causing every
   * getDoc() to hang until the app-level Promise.race timeout fires. The server
   * Admin SDK uses a different transport (@google-cloud/firestore over gRPC),
   * which is why server-side reads succeed while the client getDoc() times out.
   *
   * Memory cache avoids retaining private documents in IndexedDB on shared
   * browser profiles; authentication persistence remains unchanged.
   */
  localCache: memoryLocalCache(),
});
firestoreByApp.set(app, db);

export default app;
