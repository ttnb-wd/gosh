// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enableClientSentry = process.env.NODE_ENV === "production" && Boolean(dsn);

if (enableClientSentry) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: dsn as string,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        "ResizeObserver loop completed with undelivered notifications",
        "ResizeObserver loop limit exceeded",
        "Invalid Refresh Token: Refresh Token Not Found",
        "Non-Error promise rejection captured",
      ],
    });
  });
}

type RouterTransitionStart = typeof import("@sentry/nextjs").captureRouterTransitionStart;

export const onRouterTransitionStart = ((...args: Parameters<RouterTransitionStart>) => {
  if (!enableClientSentry) return;

  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureRouterTransitionStart(...args);
  });
}) as RouterTransitionStart;
