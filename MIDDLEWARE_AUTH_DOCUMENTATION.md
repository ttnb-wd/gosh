# Middleware Authentication for Admin Routes

## Overview

This document describes the middleware authentication implementation for protecting admin routes in the GOSH Perfume application.

## Implementation Details

### Protected Routes

The middleware protects two types of routes:

1. **Admin Pages** (`/admin/*`)
   - All routes under `/admin` except `/admin/login`
   - Redirects unauthenticated users to `/admin/login`
   - Redirects non-admin users to home page (`/`)

2. **Admin API Routes** (`/api/admin/*`)
   - All API endpoints under `/api/admin`
   - Returns 401 for unauthenticated requests
   - Returns 403 for authenticated non-admin users

### Authentication Flow

#### For Admin Pages:
1. User attempts to access `/admin/*` route
2. Middleware checks if user is authenticated via Supabase
3. If not authenticated → redirect to `/admin/login?redirect={original-path}`
4. If authenticated → check user role in `profiles` table
5. If role is not "admin" → redirect to home page
6. If role is "admin" → allow access

#### For Admin API Routes:
1. Request to `/api/admin/*` endpoint
2. Middleware checks if user is authenticated via Supabase
3. If not authenticated → return 401 Unauthorized
4. If authenticated → check user role in `profiles` table
5. If role is not "admin" → return 403 Forbidden
6. If role is "admin" → allow request

### Technical Implementation

**File:** `middleware.ts`

The middleware uses:
- `@supabase/ssr` for server-side authentication
- Next.js middleware for request interception
- Cookie-based session management

**Key Features:**
- ✅ Validates Supabase authentication tokens
- ✅ Checks admin role from database
- ✅ Preserves redirect URL for better UX
- ✅ Returns appropriate HTTP status codes for API routes
- ✅ Handles missing environment variables gracefully
- ✅ Works with existing security headers

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema

The middleware expects a `profiles` table with:
- `id` (UUID, references auth.users)
- `role` (text, values: "admin" | "user")

### Security Considerations

1. **Double Protection**: Admin routes are protected both at middleware level and in page layouts
2. **Token Validation**: Uses Supabase's `getUser()` which validates tokens server-side
3. **Role-Based Access**: Checks database role, not just authentication status
4. **API Protection**: Separate handling for API routes with proper HTTP status codes
5. **No Client-Side Bypass**: Middleware runs on server before any page renders

### Testing

To test the middleware:

1. **Unauthenticated Access**:
   - Visit `/admin` → should redirect to `/admin/login`
   - Call `/api/admin/*` → should return 401

2. **Non-Admin User**:
   - Login as regular user
   - Visit `/admin` → should redirect to `/`
   - Call `/api/admin/*` → should return 403

3. **Admin User**:
   - Login as admin user
   - Visit `/admin` → should show admin dashboard
   - Call `/api/admin/*` → should process request

### Redirect Handling

When redirecting to login, the middleware preserves the original URL:
```
/admin/products → /admin/login?redirect=/admin/products
```

After successful login, the application can redirect back to the original page.

### Performance

- Middleware runs on every request matching the matcher pattern
- Database query is cached by Supabase for the request duration
- Minimal overhead (~10-50ms per request)

### Maintenance

When adding new admin routes:
- No changes needed - all `/admin/*` routes are automatically protected
- For API routes, ensure they're under `/api/admin/*`

### Troubleshooting

**Issue**: Middleware redirects even for admin users
- Check environment variables are set correctly
- Verify user has `role = 'admin'` in profiles table
- Check browser cookies are enabled

**Issue**: API routes return 500 error
- Verify Supabase environment variables
- Check database connection
- Review server logs for detailed errors

## Related Files

- `middleware.ts` - Main middleware implementation
- `lib/auth/adminAuth.ts` - Server-side auth helpers
- `app/admin/layout.tsx` - Admin layout with additional auth check
- `components/admin/AdminAuthProvider.tsx` - Client-side auth context

## Migration Notes

This implementation:
- ✅ Maintains existing auth logic in layouts
- ✅ Adds an additional security layer
- ✅ Does not break existing functionality
- ✅ Compatible with Supabase SSR
- ✅ Works with Next.js 14+ App Router
