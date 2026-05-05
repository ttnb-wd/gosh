import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Get the pathname
  const pathname = request.nextUrl.pathname

  // Rate limiting headers (informational)
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  
  // Prevent opening downloads directly in IE
  response.headers.set('X-Download-Options', 'noopen')
  
  // Restrict Adobe Flash/PDF cross-domain policies
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  // Add CORS headers for API routes if needed
  if (pathname.startsWith('/api/')) {
    // Only allow same-origin by default
    response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
