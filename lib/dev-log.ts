/**
 * Development-only logging helper.
 *
 * All console output in client components should go through this helper so
 * that the browser console stays clean in production. In production builds
 * every method is a no-op, so no debug information, authentication details,
 * or implementation internals are exposed in the end user's DevTools console.
 *
 * Server-side code (API routes, lib/*) keeps its own console.* calls for
 * server diagnostics — those never reach the browser console.
 */
const isProduction = process.env.NODE_ENV === "production";

export const devLog = {
  log: (...args: unknown[]) => {
    if (isProduction) return;
    console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isProduction) return;
    console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isProduction) return;
    console.debug(...args);
  },
  warn: (...args: unknown[]) => {
    if (isProduction) return;
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isProduction) return;
    console.error(...args);
  },
};

export default devLog;