import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /*
   * ------------------------------------------------------------
   * PUBLIC ROUTES
   * ------------------------------------------------------------
   */

  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/");

  /*
   * ------------------------------------------------------------
   * ADMIN ROUTES
   * ------------------------------------------------------------
   *
   * Firebase authentication/authorization is handled by:
   *
   * app/admin/(protected)/layout.tsx
   * requireAdmin()
   */

  const isAdminPage =
    pathname.startsWith("/admin") &&
    !isPublicRoute;

  /*
   * ------------------------------------------------------------
   * ADMIN API
   * ------------------------------------------------------------
   *
   * Server API routes handle their own Firebase auth.
   */

  const isAdminApi =
    pathname.startsWith("/api/admin");

  /*
   * ------------------------------------------------------------
   * RESPONSE
   * ------------------------------------------------------------
   */

  const response = NextResponse.next({
    request,
  });

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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};