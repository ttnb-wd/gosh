import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/*
 * Vercel only injects its preview tooling (Live Feedback, the preview
 * toolbar/SSO manifest) into non-production deployments. These resources
 * must NOT appear in the production CSP, so we gate them on VERCEL_ENV
 * (set to "production" exclusively for production deployments on Vercel).
 */
const isVercelProduction = process.env.VERCEL_ENV === "production";

const vercelPreviewScript = isVercelProduction
  ? []
  : ["https://vercel.live/_next-live/feedback/feedback.js"];

const vercelPreviewConnect = isVercelProduction ? [] : ["https://vercel.com"];

const vercelPreviewManifest = isVercelProduction ? [] : ["https://vercel.com"];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },

  /*
   * Bundle Firebase Admin's JWT signing/verification chain *into* the Webpack
   * server bundle instead of leaving it externalized at runtime.
   *
   * WHY we must bundle `firebase-admin`, `jwks-rsa` and `jose`:
   *
   * firebase-admin@14 -> jwks-rsa@4 (CommonJS) -> jose@6 (ESM-only, `type:
   * "module"`). `jwks-rsa/src/utils.js` performs a CommonJS `require('jose')`,
   * but every `jose@6.x` release is ESM-only.
   *
   * Previously these three were listed in `serverExternalPackages`. In a
   * `next build --webpack` server build that list feeds `optOutBundlingPackageRegex`
   * in `webpack-config.js`, so matching `node_modules/*` entries are treated as
   * Webpack `externals` (left as a runtime `require()` boundary instead of being
   * inlined). On Vercel that keeps a live CJS boundary where an external
   * `jwks-rsa/src/utils.js` calls `require('jose')`. Regardless of Node's
   * unflagged `require(esm)` support (>= 20.19 / 22.12), the package-managed ESM
   * entry is what Vercel resolves, throwing:
   *
   *   Error [ERR_REQUIRE_ESM]: require() of ES Module
   *   /var/task/node_modules/jose/dist/webapi/index.js ... not supported.
   *
   * Bundling the whole `firebase-admin -> jwks-rsa -> jose` chain with Webpack
   * inlines `jose` into the server chunk (Webpack 5 handles ESM natively), so
   * there is no runtime CJS `require('jose')` boundary anymore.
   *
   * The remaining entries in `serverExternalPackages` (`google-auth-library`,
   * `jsonwebtoken`, `@firebase/*`, `@google-cloud/*`, `@fastify/busboy`) are
   * kept external because none of them (transitively) `require('jose')` —
   * `google-auth-library` and `jsonwebtoken` both go through `jws` -> `jwa`,
   * which are CommonJS and never reach the ESM-only `jose`. Only the three
   * packages that form the ESM boundary are removed from externalization.
   *
   * Firebase Admin (and the inlined `jose`) remains server-only - none of it is
   * reachable from a client component.
   */
  serverExternalPackages: [
    "google-auth-library",
    "jsonwebtoken",
    "@fastify/busboy",
    "@firebase/database",
    "@firebase/database-compat",
    "@firebase/app",
    "@google-cloud/firestore",
    "@google-cloud/storage",
  ],

  /*
   * `firebase-admin` is STILL external even after removing it from
   * `serverExternalPackages`, because it is also in Next's BUILT-IN default
   * external list (next/dist/lib/server-external-packages.jsonc). That default
   * list is merged into `optOutBundlingPackages` -> `optOutBundlingPackageRegex`
   * in Next's webpack-config.js, so Next keeps emitting external `import()`
   * shims for `firebase-admin/app|auth|firestore` and the runtime CJS boundary
   * `firebase-admin -> jwks-rsa -> require("jose")` (jose is ESM-only) remains,
   * causing ERR_REQUIRE_ESM on Vercel.
   *
   * This `webpack` hook force-bundles `firebase-admin` (and therefore the
   * ESM-only `jose` chain) into the Node.js server bundle. Next's Node server
   * externals array is `[...builtinModules, ...bunExternals, handleExternals]`.
   * We drop the trailing `handleExternals` function and re-append a wrapper that
   * returns "not external" for any `firebase-admin(*)` request (so Webpack
   * resolves & inlines it) while delegating every other request to the original
   * handler. Node builtins and the other opt-out packages stay external exactly
   * as before.
   */
  webpack(config, { isServer, nextRuntime }) {
    if (isServer && nextRuntime !== "edge") {
      // Cast to `any` to safely poke webpack.Configuration.externals without
      // fighting the Externals union type (the override below is structurally
      // compatible with webpack's array/function external form).
      const wc = config as any;
      if (Array.isArray(wc.externals)) {
        const externals = wc.externals;
        const last = externals[externals.length - 1];
        if (typeof last === "function") {
          wc.externals = [
            ...externals.slice(0, -1),
            (data: any, cb: any) => {
              if (
                data &&
                typeof data.request === "string" &&
                /^firebase-admin(\/|$)/.test(data.request)
              ) {
                // "Not external" -> Webpack resolves & bundles firebase-admin,
                // inlining the ESM-only `jose`/`jwks-rsa` chain.
                return cb();
              }
              return last(data, cb);
            },
          ];
        }
      }
    }
    return config as typeof config;
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
           * - Firebase Auth
           * - Firebase Firestore
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
              [
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.cloudflare.com https://*.sentry.io https://www.googletagmanager.com https://www.google-analytics.com",
                ...vercelPreviewScript,
              ].join(" "),

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
               * Firebase Authentication
               * Firebase Firestore
               * ImageKit uploads
               * Turnstile
               * Sentry
               * Google Analytics
               */
              [
                "connect-src 'self'",

                  // Firebase Authentication
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",

                  // Firebase Firestore
                "https://firestore.googleapis.com",

                  // ImageKit uploads
                "https://upload.imagekit.io",

                  // Cloudflare Turnstile
                "https://challenges.cloudflare.com",
                "https://*.cloudflare.com",

                  // Sentry
                "https://*.sentry.io",

                 // Google Analytics / Tag Manager
               "https://www.google-analytics.com",
               "https://www.googletagmanager.com",
               ...vercelPreviewConnect,
              ].join(" "),

              /*
               * Vercel preview web-app manifest (non-production only).
               */
              ["manifest-src 'self'", ...vercelPreviewManifest].join(" "),

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
