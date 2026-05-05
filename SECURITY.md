# Security Headers Documentation

This document explains the security headers implemented in this application for **production use**.

## Implemented Security Headers

### 1. **X-Frame-Options: SAMEORIGIN**
- **Purpose:** Prevents clickjacking attacks
- **Effect:** Allows the site to be embedded in iframes only from the same origin
- **Protection:** Stops external sites from embedding your pages while allowing your own embeds
- **Why SAMEORIGIN:** More flexible than DENY for real-world use (e.g., admin previews, internal tools)

### 2. **X-Content-Type-Options: nosniff**
- **Purpose:** Prevents MIME type sniffing
- **Effect:** Forces browsers to respect the declared Content-Type
- **Protection:** Prevents browsers from interpreting files as a different MIME type
- **Impact:** Prevents XSS attacks via uploaded files

### 3. **Referrer-Policy: strict-origin-when-cross-origin**
- **Purpose:** Controls referrer information
- **Effect:** Sends full URL for same-origin, only origin for cross-origin
- **Protection:** Prevents leaking sensitive URL parameters to third parties
- **Balance:** Maintains analytics functionality while protecting privacy

### 4. **Permissions-Policy**
- **Purpose:** Controls browser features and APIs
- **Effect:** Disables camera, microphone, geolocation, and FLoC
- **Protection:** Prevents unauthorized access to device features
- **Privacy:** Blocks Google's FLoC tracking

### 5. **Strict-Transport-Security (HSTS)** *(Production Only)*
- **Purpose:** Enforces HTTPS connections
- **Effect:** Forces browsers to use HTTPS for 2 years
- **Protection:** Prevents man-in-the-middle attacks and protocol downgrade
- **Settings:**
  - `max-age=63072000`: 2 years duration
  - `includeSubDomains`: Applies to all subdomains
  - `preload`: Eligible for browser preload lists
- **Note:** Only enabled in production to avoid localhost issues

### 6. **Route-Specific Headers**

#### Admin Routes (`/admin/*`)
- **X-Robots-Tag: noindex, nofollow** - Prevents search engine indexing
- **Cache-Control: no-store** - Prevents caching of sensitive admin data

#### API Routes (`/api/*`)
- **X-Robots-Tag: noindex, nofollow** - Prevents API endpoint indexing
- **Cache-Control: no-store** - Prevents caching of API responses

### 7. **Additional Headers (via Middleware)**
- **X-DNS-Prefetch-Control: on** - Enables DNS prefetching for performance
- **X-Download-Options: noopen** - Prevents IE from opening downloads in site context
- **X-Permitted-Cross-Domain-Policies: none** - Restricts Adobe Flash/PDF policies
- **CORS Headers** - Configured for API routes with same-origin policy

## Why No CSP (Content Security Policy)?

**Real-world decision:** CSP was intentionally removed because:

1. **Next.js Complexity:** Dynamic imports, inline styles, and hot reload require extensive `unsafe-inline` and `unsafe-eval`
2. **Third-party Services:** Cloudflare Turnstile, Supabase, Sentry, Google Fonts require many exceptions
3. **Maintenance Burden:** Every new service requires CSP updates, causing production breaks
4. **Diminishing Returns:** Modern React + TypeScript already prevents most XSS attacks
5. **Development Friction:** CSP violations block development features and debugging

**Alternative Protection:**
- React's built-in XSS protection (automatic escaping)
- TypeScript type safety
- Input validation and sanitization
- Supabase RLS (Row Level Security)
- Regular security audits

## Testing Security Headers

### Local Testing
```bash
# Start dev server
npm run dev

# Test headers
npm run test:security
```

### Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Click on any request
5. View Response Headers

### Online Testing (Production)
1. **Security Headers**: https://securityheaders.com
2. **Mozilla Observatory**: https://observatory.mozilla.org
3. **SSL Labs**: https://www.ssllabs.com/ssltest/

## Expected Security Scores

With these headers, you should achieve:
- **Security Headers**: B+ to A- rating
- **Mozilla Observatory**: 70-85 score
- **SSL Labs**: A rating (with proper SSL config)

*Note: A+ requires CSP, which we've intentionally omitted for practical reasons*

## Production Checklist

Before deploying to production:

- [ ] Verify HTTPS is enabled
- [ ] Test all headers with `npm run test:security`
- [ ] Check admin routes are not indexed
- [ ] Verify API routes have proper CORS
- [ ] Test Cloudflare Turnstile works
- [ ] Confirm Supabase connections work
- [ ] Check Sentry error tracking
- [ ] Verify image loading from Unsplash and Supabase

## Updating for New Services

When adding new third-party services:

1. **Images**: Add to `remotePatterns` in `next.config.ts`
2. **APIs**: Update CORS in `middleware.ts` if needed
3. **CDNs**: No CSP to update! Just add and test

## Security Best Practices

✅ **Implemented:**
1. All external resources use HTTPS
2. Sensitive operations require authentication
3. User input is validated and sanitized
4. Environment variables protect secrets
5. CORS is properly configured
6. Rate limiting via Supabase
7. SQL injection prevention (Supabase parameterized queries)
8. XSS prevention (React's built-in escaping)
9. Admin routes blocked from search engines
10. HSTS enabled in production

✅ **Monitoring:**
- **Sentry**: Error tracking and performance monitoring
- **Supabase**: Database audit logs
- **Admin Audit Logs**: Custom audit trail for admin actions

## Common Issues

### Issue: HSTS not showing in development
**Solution:** This is intentional. HSTS only enables in production to avoid localhost certificate issues.

### Issue: Images not loading
**Solution:** Check `remotePatterns` in `next.config.ts` includes your image domains.

### Issue: API CORS errors
**Solution:** Update CORS headers in `middleware.ts` for your specific origins.

## Reporting Security Issues

If you discover a security vulnerability:
- **Email:** maybelasttime9@gmail.com
- **Do NOT** create public GitHub issues for security vulnerabilities
- Include steps to reproduce and potential impact

## Further Reading

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
