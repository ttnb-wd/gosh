# Deployment Security Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Environment Variables
- [ ] All sensitive keys are in environment variables (not hardcoded)
- [ ] `.env` file is in `.gitignore`
- [ ] Production environment variables are set in hosting platform
- [ ] `NEXT_PUBLIC_*` variables contain no secrets

### Security Headers
- [ ] Run `npm run test:security` locally
- [ ] Verify HSTS will enable in production (check `NODE_ENV`)
- [ ] Confirm X-Frame-Options is set to SAMEORIGIN
- [ ] Check admin routes have noindex headers

### SSL/TLS
- [ ] HTTPS is enabled on hosting platform
- [ ] SSL certificate is valid and not expired
- [ ] Redirect HTTP to HTTPS is configured
- [ ] Test SSL configuration at https://www.ssllabs.com/ssltest/

### Authentication & Authorization
- [ ] Admin routes require authentication
- [ ] Supabase RLS policies are enabled
- [ ] Session timeout is configured
- [ ] Password requirements are enforced

### API Security
- [ ] API routes validate input
- [ ] Rate limiting is configured (via Supabase)
- [ ] CORS is properly configured
- [ ] API keys are rotated and secure

### Database
- [ ] Supabase RLS policies are tested
- [ ] Database backups are enabled
- [ ] Sensitive data is encrypted
- [ ] SQL injection prevention is verified

### Third-Party Services
- [ ] Cloudflare Turnstile is configured
- [ ] Sentry error tracking is enabled
- [ ] Email service (Resend) is configured
- [ ] All API keys are production keys (not test keys)

## Post-Deployment

### Verification
- [ ] Test security headers at https://securityheaders.com
- [ ] Run Mozilla Observatory scan
- [ ] Verify robots.txt is accessible
- [ ] Check sitemap.xml is accessible
- [ ] Test admin login functionality
- [ ] Verify email notifications work
- [ ] Test payment screenshot upload
- [ ] Check Cloudflare Turnstile on forms

### Monitoring
- [ ] Sentry is receiving events
- [ ] Error alerts are configured
- [ ] Performance monitoring is active
- [ ] Admin audit logs are working

### SEO & Indexing
- [ ] Submit sitemap to Google Search Console
- [ ] Verify robots.txt allows public pages
- [ ] Confirm admin routes are noindex
- [ ] Check Open Graph tags are working

### Performance
- [ ] Run Lighthouse audit (aim for 90+ scores)
- [ ] Test page load times
- [ ] Verify images are optimized
- [ ] Check Core Web Vitals

## Security Testing

### Manual Testing
```bash
# Test security headers
npm run test:security https://yourdomain.com

# Check SSL
curl -I https://yourdomain.com

# Verify HSTS
curl -I https://yourdomain.com | grep -i strict-transport-security
```

### Automated Testing
- [ ] Set up automated security scans
- [ ] Configure dependency vulnerability alerts
- [ ] Enable Dependabot or similar
- [ ] Schedule regular security audits

## Incident Response

### Preparation
- [ ] Document security contact email
- [ ] Create incident response plan
- [ ] Set up security alert notifications
- [ ] Prepare rollback procedure

### Monitoring
- [ ] Monitor Sentry for unusual errors
- [ ] Watch for failed login attempts
- [ ] Track API rate limit hits
- [ ] Review admin audit logs regularly

## Compliance

### Data Protection
- [ ] Privacy policy is published
- [ ] Terms of service are published
- [ ] Cookie consent is implemented (if needed)
- [ ] Data retention policy is defined

### Legal
- [ ] Refund policy is published
- [ ] Delivery policy is published
- [ ] Contact information is accessible
- [ ] Business registration is valid

## Regular Maintenance

### Weekly
- [ ] Review error logs in Sentry
- [ ] Check admin audit logs
- [ ] Monitor failed login attempts

### Monthly
- [ ] Update dependencies
- [ ] Review security headers
- [ ] Test backup restoration
- [ ] Audit user permissions

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing (if budget allows)
- [ ] Review and update policies
- [ ] Rotate API keys and secrets

## Emergency Contacts

- **Security Issues**: maybelasttime9@gmail.com
- **Hosting Support**: [Your hosting provider]
- **Database Support**: Supabase support
- **CDN Support**: Cloudflare support

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Vercel Security](https://vercel.com/docs/security)

---

**Last Updated**: [Update this date when deploying]
**Next Review**: [Schedule next security review]
