import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * ------------------------------------------------------------
   * SUPABASE CONFIGURATION
   * ------------------------------------------------------------
   */

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Proxy] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );

    return NextResponse.next();
  }

  /*
   * ------------------------------------------------------------
   * INITIAL RESPONSE
   * ------------------------------------------------------------
   */

  let response = NextResponse.next({
    request,
  });

  /*
   * ------------------------------------------------------------
   * REQUEST-SCOPED SUPABASE CLIENT
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * Never create this client globally.
   * Every request must use its own cookie state.
   */

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          /*
           * Update request cookies first.
           *
           * This allows refreshed authentication cookies
           * to be available during the current request.
           */

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          /*
           * Recreate response with updated request cookies.
           */

          response = NextResponse.next({
            request,
          });

          /*
           * Send refreshed cookies back to browser.
           */

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  /*
   * ------------------------------------------------------------
   * AUTHENTICATION SESSION CHECK
   * ------------------------------------------------------------
   *
   * getClaims() validates the JWT and allows Supabase SSR
   * to refresh the session when necessary.
   */

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims = claimsData?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  /*
   * ------------------------------------------------------------
   * PUBLIC AUTH ROUTES
   * ------------------------------------------------------------
   *
   * These routes must remain accessible without authentication.
   */

  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/");

  /*
   * ------------------------------------------------------------
   * ADMIN PAGE PROTECTION
   * ------------------------------------------------------------
   *
   * /admin/login is public.
   *
   * Every other /admin page requires authentication.
   */

  const isAdminPage =
    pathname.startsWith("/admin") &&
    !isPublicAuthRoute;

  if (isAdminPage) {
    if (claimsError || !claims) {
      const loginUrl = new URL(
        "/admin/login",
        request.url
      );

      loginUrl.searchParams.set(
        "redirect",
        pathname
      );

      return NextResponse.redirect(loginUrl);
    }
  }

  /*
   * ------------------------------------------------------------
   * ADMIN API PROTECTION
   * ------------------------------------------------------------
   *
   * API routes must return HTTP status codes instead of
   * redirecting to a login page.
   */

  const isAdminApi =
    pathname.startsWith("/api/admin");

  if (isAdminApi) {
    if (claimsError || !claims) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * SECURITY HEADERS
   * ------------------------------------------------------------
   */

  response.headers.set(
    "X-DNS-Prefetch-Control",
    "on"
  );

  response.headers.set(
    "X-Download-Options",
    "noopen"
  );

  response.headers.set(
    "X-Permitted-Cross-Domain-Policies",
    "none"
  );

  /*
   * Prevent framing of authenticated/admin pages.
   */

  if (isAdminPage || isAdminApi) {
    response.headers.set(
      "X-Frame-Options",
      "DENY"
    );

    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0"
    );
  }

  /*
   * ------------------------------------------------------------
   * RETURN RESPONSE
   * ------------------------------------------------------------
   */

  return response;
}

/*
 * ------------------------------------------------------------
 * NEXT.JS PROXY MATCHER
 * ------------------------------------------------------------
 *
 * Run proxy for application routes while skipping:
 *
 * - Next static files
 * - Next image optimizer
 * - favicon
 * - public image assets
 */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};