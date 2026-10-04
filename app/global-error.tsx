"use client";

import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import "./ambient-background.css";
import { AmbientBackgroundVisual } from "@/components/GlobalAmbientBackground";
import ThemeInit from "@/components/ThemeInit";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head><ThemeInit /></head>
      <body className="relative isolate bg-canvas text-ink">
        <AmbientBackgroundVisual variant="pearl" />
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-panel">
            <p className="mb-6 font-serif text-4xl">GOSH</p>
            <h1 className="mb-3 text-xl font-medium">A moment of interruption</h1>
            <p className="mb-6 text-sm leading-6 text-muted">The studio couldn’t load this page. Please refresh and try again.</p>
            <button type="button" className="studio-compact-button studio-compact-button--primary" onClick={() => window.location.reload()}>Refresh page</button>
          </section>
        </main>
      </body>
    </html>
  );
}
