import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseHost = "wfiejzhiuuegfxjbdupq.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Download-Options",
            value: "noopen",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },

          /*
           * ============================================================
           * Content Security Policy
           * ============================================================
           *
           * Required for:
           * - Supabase Auth
           * - Supabase Realtime
           * - Cloudflare Turnstile
           * - Sentry
           * - Google Tag Manager / Analytics
           */

          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",

              /*
               * JavaScript
               */
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.cloudflare.com https://*.sentry.io https://www.googletagmanager.com https://www.google-analytics.com",

              /*
               * Styles
               */
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

              /*
               * Images
               */
              "img-src 'self' data: blob: https:",

              /*
               * Fonts
               */
              "font-src 'self' data: https://fonts.gstatic.com",

              /*
               * Network requests
               *
               * Supabase REST/Auth/Storage
               * Supabase Realtime
               * Turnstile
               * Sentry
               * Google Analytics
               */
              [
                "connect-src 'self'",
                `https://${supabaseHost}`,
                `wss://${supabaseHost}`,
                "https://challenges.cloudflare.com",
                "https://*.cloudflare.com",
                "https://*.sentry.io",
                "https://www.google-analytics.com",
                "https://www.googletagmanager.com",
              ].join(" "),

              /*
               * Turnstile iframe
               */
              "frame-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com",

              /*
               * Prevent plugins
               */
              "object-src 'none'",

              /*
               * Restrict base URL
               */
              "base-uri 'self'",

              /*
               * Restrict form submissions
               */
              "form-action 'self'",

              /*
               * Prevent embedding this website
               */
              "frame-ancestors 'none'",

              /*
               * Only use HTTPS resources in production.
               *
               * IMPORTANT:
               * This can interfere with local development,
               * so only enable it in production.
               */
              ...(process.env.NODE_ENV === "production"
                ? ["upgrade-insecure-requests"]
                : []),
            ].join("; "),
          },

          /*
           * HSTS
           *
           * Only enabled in production.
           */
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value:
                    "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },

      /*
       * ============================================================
       * ADMIN ROUTES
       * ============================================================
       */
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
          {
            key: "Cache-Control",
            value:
              "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },

      /*
       * ============================================================
       * API ROUTES
       * ============================================================
       */
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: true,

  widenClientFileUpload: true,

  webpack: {
    automaticVercelMonitors: true,

    treeshake: {
      removeDebugLogging: true,
    },
  },
});