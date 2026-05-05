# Admin Authentication - Quick Reference

## What Was Implemented

✅ **Middleware-based authentication** for all admin routes
✅ **Automatic redirects** for unauthenticated users
✅ **Role-based access control** checking database roles
✅ **API route protection** with proper HTTP status codes
✅ **Redirect preservation** for better user experience

## Protected Routes

### Admin Pages
- `/admin/*` (except `/admin/login`)
- Redirects to `/admin/login` if not authenticated
- Redirects to `/` if not admin

### Admin API Routes
- `/api/admin/*`
- Returns 401 if not authenticated
- Returns 403 if not admin

## How It Works

```
User Request → Middleware → Check Auth → Check Role → Allow/Deny
```

### For Pages:
```
/admin/products
  ↓
Not logged in? → /admin/login?redirect=/admin/products
  ↓
Not admin? → /
  ↓
Admin? → Show page
```

### For API:
```
/api/admin/email/order-status
  ↓
Not logged in? → 401 Unauthorized
  ↓
Not admin? → 403 Forbidden
  ↓
Admin? → Process request
```

## Security Layers

1. **Middleware** (First line of defense)
   - Runs before any page renders
   - Cannot be bypassed client-side
   - Validates tokens server-side

2. **Layout Auth** (Second layer)
   - Additional check in `app/admin/layout.tsx`
   - Uses `requireAdmin()` function
   - Provides extra security

3. **Client Context** (UI state)
   - `AdminAuthProvider` for client components
   - Manages auth state in React
   - Handles UI updates

## Files Modified

- ✅ `middleware.ts` - Added admin authentication logic

## Files Created

- ✅ `MIDDLEWARE_AUTH_DOCUMENTATION.md` - Full documentation
- ✅ `ADMIN_AUTH_QUICK_REFERENCE.md` - This file

## Testing Checklist

- [ ] Visit `/admin` without login → redirects to `/admin/login`
- [ ] Login as regular user → redirects to `/` when accessing `/admin`
- [ ] Login as admin → can access all `/admin/*` pages
- [ ] Call `/api/admin/*` without auth → returns 401
- [ ] Call `/api/admin/*` as regular user → returns 403
- [ ] Call `/api/admin/*` as admin → works correctly
- [ ] Redirect URL preserved: `/admin/products` → `/admin/login?redirect=/admin/products`

## Environment Variables

Required in `.env` or `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Requirements

Table: `profiles`
- `id` (UUID) - references auth.users(id)
- `role` (text) - must be "admin" for admin access

## Common Issues

**Problem**: Redirects even for admin users
**Solution**: Check user has `role = 'admin'` in profiles table

**Problem**: 500 error on API routes
**Solution**: Verify environment variables are set

**Problem**: Infinite redirect loop
**Solution**: Ensure `/admin/login` is excluded from protection

## Performance Impact

- Minimal: ~10-50ms per request
- Cached by Supabase during request
- No impact on non-admin routes

## Next Steps

1. Test all scenarios in the checklist
2. Monitor server logs for any errors
3. Verify admin users can access all features
4. Confirm non-admin users are properly blocked

## Support

For issues or questions:
1. Check `MIDDLEWARE_AUTH_DOCUMENTATION.md` for details
2. Review middleware logs in server console
3. Verify database schema matches requirements
4. Test with different user roles
