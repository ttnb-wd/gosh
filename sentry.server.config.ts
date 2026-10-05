import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
      sendDefaultPii: false,
      beforeSend(event) {
        delete event.request; delete event.user; delete event.extra; delete event.contexts;
        event.breadcrumbs = [];
        if (event.exception?.values) for (const exception of event.exception.values) exception.value = "Application operation failed.";
        if (event.message) event.message = "Application operation failed.";
        return event;
      },
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    ignoreErrors: ["Invalid Refresh Token: Refresh Token Not Found"],
  });
}
