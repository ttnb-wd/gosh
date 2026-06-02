# 🔒 SECURITY MAINTENANCE GUIDE

## Daily Monitoring (Automated)

### Sentry Error Tracking
- ✅ Already configured
- Monitor: `https://sentry.io/organizations/gosh-perfume`
- Alert on: Authentication failures, API errors, CSP violations

### Supabase Dashboard
- Check daily: Dashboard → Logs
- Watch for: Failed auth attempts, unusual query patterns
- Alert on: Multiple failed login attempts from same IP

---

## Weekly Tasks (5 minutes)

### 1. Review Failed Login Attempts
```sql
-- Run in Supabase SQL Editor
SELECT 
    created_at,
    email,
    error_message,
    COUNT(*) as attempt_count
FROM auth.audit_log_entries
WHERE action = 'login'
    AND created_at > NOW() - INTERVAL '7 days'
    AND error_message IS NOT NULL
GROUP BY created_at, email, error_message
ORDER BY attempt_count DESC
LIMIT 20;
```

### 2. Check Admin Activity
```sql
-- Review admin actions
SELECT 
    actor_email,
    action,
    entity_type,
    entity_label,
    created_at
FROM public.admin_audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### 3. Review Rate Limit Hits
- Check application logs for rate limit messages
- Look for patterns of abuse
- Consider lowering limits if spam detected

---

## Monthly Tasks (15 minutes)

### 1. Review and Rotate API Keys (if needed)
```bash
# Check key age in Supabase Dashboard
# Rotate if:
# - Key is > 90 days old
# - Suspected exposure
# - Employee departure
```

**Keys to Consider Rotating**:
- Supabase anon key (only if compromised)
- Turnstile keys (only if compromised)
- Resend API key (if email abuse detected)
- Sentry auth token (only if compromised)

### 2. Review RLS Policies
```sql
-- Run SECURITY_STATUS.sql to verify all tables protected
-- Check for new tables without RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = false;
-- Should return 0 rows
```

### 3. Update Dependencies
```bash
# Check for security updates
npm audit

# Update packages
npm update

# Fix vulnerabilities
npm audit fix
```

### 4. Review Vercel Logs
- Go to Vercel Dashboard → Logs
- Look for: 4xx/5xx errors, slow requests, unusual traffic
- Check: Geographic distribution of requests

---

## Quarterly Tasks (30 minutes)

### 1. Security Audit
- Run complete security check (use `SECURITY_STATUS.sql`)
- Review all RLS policies
- Test authentication flows
- Verify admin protections

### 2. Penetration Testing
- Attempt to access other users' data
- Try admin routes without auth
- Test input validation with edge cases
- Check for exposed API endpoints

### 3. Review User Permissions
```sql
-- List all admin users
SELECT id, email, role, created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at;

-- Remove inactive admins if needed
```

### 4. Backup Verification
- Verify Supabase automatic backups enabled
- Test restoration process (on test database)
- Document backup retention policy

---

## Annual Tasks (1 hour)

### 1. Comprehensive Security Review
- Review this security report
- Check for new OWASP Top 10 vulnerabilities
- Update security headers if needed
- Review and update CSP policy

### 2. Disaster Recovery Test
- Test database restoration
- Verify all backups accessible
- Document recovery procedures
- Update incident response plan

### 3. Compliance Check
- Review data retention policies
- Verify GDPR compliance (if applicable)
- Check payment security (if handling payments)
- Update privacy policy if needed

---

## Incident Response Plan

### If You Detect a Security Breach:

#### 1. Immediate Actions (Within 1 hour)
```bash
# 1. Rotate all API keys immediately
# Supabase Dashboard → Settings → API Keys → Reset

# 2. Force logout all users
# Supabase Dashboard → Authentication → Users → Force Sign Out

# 3. Review recent database changes
# Supabase Dashboard → Logs → Query Logs
```

#### 2. Investigation (Within 24 hours)
```sql
-- Check for suspicious admin activity
SELECT * FROM public.admin_audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Check for unauthorized data access
SELECT * FROM public.orders
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- Check for new admin accounts
SELECT * FROM public.profiles
WHERE role = 'admin'
    AND created_at > NOW() - INTERVAL '30 days';
```

#### 3. Remediation
- Fix the vulnerability
- Restore from backup if needed
- Notify affected users (if applicable)
- Document the incident

#### 4. Prevention
- Update security measures
- Add monitoring for similar attacks
- Train team on new procedures

---

## Security Contacts

### Internal
- **Admin Email**: maybelasttime9@gmail.com
- **Notification Email**: maybelasttime9@gmail.com

### External Services
- **Supabase Support**: https://supabase.com/support
- **Vercel Support**: https://vercel.com/support
- **Cloudflare Support**: https://www.cloudflare.com/support/

### Security Disclosure
If someone reports a security vulnerability:
1. Thank them immediately
2. Confirm the vulnerability
3. Fix within 24-48 hours
4. Credit the reporter (if they wish)
5. Document in changelog

---

## Monitoring Alerts to Set Up

### Recommended Alerts:

1. **Supabase**:
   - Failed auth attempts > 10 per hour
   - Database CPU > 80%
   - Storage > 80% capacity

2. **Vercel**:
   - 5xx errors > 10 per hour
   - Response time > 3 seconds
   - Build failures

3. **Sentry**:
   - New error types
   - Error rate > 5% of requests
   - CSP violations

---

## Security Metrics to Track

### Monthly Report Should Include:

```
Security Metrics - [Month Year]
================================

Authentication:
- Total login attempts: X
- Failed login attempts: Y
- Account lockouts: Z

Rate Limiting:
- Total blocked requests: X
- Most blocked endpoint: Y
- Top blocked IPs: [list]

Admin Activity:
- Admin actions: X
- New admins added: Y
- Products modified: Z

Database:
- RLS policy violations: 0 (should always be 0)
- Query performance: [avg time]
- Storage used: X%

Vulnerabilities:
- npm audit findings: X (aim for 0 high/critical)
- New CVEs affecting dependencies: Y
- Patches applied: Z
```

---

## Tools for Security Monitoring

### Free Tools:
- ✅ **Sentry** (already configured) - Error tracking
- ✅ **Supabase Dashboard** - Database monitoring
- ✅ **Vercel Analytics** - Performance & security
- ✅ **GitHub Dependabot** - Dependency alerts
- 💡 **Google Search Console** - Security issues

### Paid Tools (Optional):
- **Vercel Pro** - Advanced security features
- **Supabase Pro** - Point-in-time recovery
- **DataDog** - Advanced monitoring
- **PagerDuty** - Alert management

---

## Security Checklist for New Features

Before deploying new features, verify:

- [ ] Input validation added for all user inputs
- [ ] Rate limiting applied to new API endpoints
- [ ] RLS policies added for new database tables
- [ ] Security headers cover new routes
- [ ] No sensitive data in client-side code
- [ ] Error messages don't leak information
- [ ] New dependencies scanned for vulnerabilities
- [ ] Authentication required where needed
- [ ] Admin-only features protected
- [ ] Tested with malicious inputs

---

## Additional Resources

### Security Training:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security Best Practices: https://supabase.com/docs/guides/platform/going-into-prod
- Next.js Security: https://nextjs.org/docs/advanced-features/security-headers

### Security News:
- CVE Details: https://www.cvedetails.com/
- Snyk Blog: https://snyk.io/blog/
- Vercel Security: https://vercel.com/changelog

---

**Remember**: Security is an ongoing process, not a one-time task. Regular monitoring and maintenance are essential to keeping your application secure! 🔒
