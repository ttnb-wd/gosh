# GOSH Firebase authentication

## Architecture and scope

Firebase Email/Password is the only authentication provider. Firebase sends verification
and password-reset emails using its built-in delivery service. No paid email service
or new dependency is required for authentication.

The browser uses the existing Firebase SDK persistence (including its internal
IndexedDB/browser state). Application code never stores tokens in localStorage or
sessionStorage. The Next.js application session is the existing firebase-session
httpOnly cookie: 24 hours, Path=/, SameSite=Lax, Secure in production.
Session creation requires a revoked-token check, a sign-in within five minutes,
and verified email. Existing admins are exempt from email verification only when
their role is read from users/{uid} on the server, preserving legacy admin login.

Both customer and admin sign-in clear the previous browser/server session before
signing into another account. Logout revokes all of that user's Firebase refresh
tokens, matching the project's prior logout semantics; it therefore signs out
other devices too. Revocation failures are reported and remain retryable.
Expired/invalid cookies can still be cleared.

Admin authorization always checks Firestore users/{uid}.role == "admin" on the
server. Client role data only controls presentation. Existing protected API
helpers keep supporting verified bearer tokens for existing checkout calls, and
also accept the session cookie. Unsafe cookie-authenticated requests require a
matching Origin. User identity, email, and roles supplied in request bodies are
ignored.

New profiles retain id, email, full_name, role, created_at, updated_at and add
emailVerified. New roles are "user"; existing "customer" and "admin" profiles are
preserved. Creation is transactional and uses Firebase Auth identity. Passwords
are never written to Firestore. Profile emailVerified is informational, never
authorization evidence. Roles and identity fields are writable only through
trusted server/Admin SDK operations. Direct client profile edits are limited to
full_name, phone and updated_at.

Account, account/security, orders and checkout have server session guards.
Public storefront/product/promotion pages remain public. Existing order, payment,
product and promotion business logic is untouched.

## Routes

- /login: existing form with login and signup modes.
- /register: routes to the same form's signup mode.
- /verify-email: send/resend/check verification and consume verification action codes.
- /forgot-password: generic account-existence-safe reset request.
- /reset-password: validate code, new password and confirmation, consume reset code.
- /auth/action: dispatch Firebase email actions to verification or reset.
- /account and /account/security: server-protected account and password change.
- /admin/login: existing admin sign-in; same session endpoint and role system.
- POST /api/auth/session: secure cookie creation.
- GET /api/auth/session: no-store session status, derived server-side.
- DELETE /api/auth/session and POST /api/auth/logout: shared logout implementation.
- POST /api/auth/ensure-profile: trusted, transactional profile synchronization.
- POST /api/auth/password-reset: Firebase OOB delivery request with existing rate limiting.

Verification reloads Firebase user state and forces a fresh ID token for the
existing server session. The server independently verifies the email claim and
recent sign-in. Verified users continue to their original account/order/checkout
destination; older sign-ins return to Sign In with that destination preserved.
Verification links can be opened in another browser without a signed-in client.
Password change requires the current password via reauthentication and signs the
user out after success. If only the server cookie remains and Firebase client
state is missing, password change asks the user to sign in again.

## Firebase Console / deployment checklist (manual)

1. Enable Authentication > Sign-in method > Email/Password. Do not add Google.
2. Enable email enumeration protection. Configure a password policy consistent
   with the app's minimum eight characters, letters and numbers (maximum 128).
3. Authentication > Settings > Authorized domains: include localhost and
   www.goshperfumestudio.com. Add the actual preview hostname if needed. The
   production auth URL is centralized in lib/auth/config.ts and can be configured
   with NEXT_PUBLIC_SITE_URL. Localhost development uses its current origin.
4. Authentication > Templates > Email address verification and Password reset:
   set the custom action URL to https://www.goshperfumestudio.com/auth/action
   once the deployment is available. Both templates share the action dispatcher.
   The default Firebase-hosted handler also works, but completes reset there
   instead of in the GOSH reset page.
5. Review template branding/sender and verify inbox/spam delivery with real,
   consenting test accounts. The Firebase API, not Admin generatePasswordResetLink,
   sends reset emails. No Resend key is needed for authentication.
6. Deploy only the reviewed users/{userId} rule changes from firestore.rules.
   Existing non-user rules are preserved. Verify role-change attempts from a
   normal client and an admin client are denied; promote admins through a trusted
   Admin SDK operation or the Firebase Console.
7. Set client and server variables in Vercel Production and the preview
   environment used for testing. Redeploy after changing build-time NEXT_PUBLIC
   variables. Client/server project IDs must match. Use a service-account PEM
   private key, with real newlines or escaped newline sequences; never prefix
   private credentials with NEXT_PUBLIC. Preserve the existing Node/Webpack
   Firebase Admin configuration in next.config.ts.
8. Check that any Google API key restrictions allow the Identity Toolkit API and
   the server-side password-reset request. Browser-referrer-only restrictions
   can prevent a server REST call; use appropriate API restrictions without
   disabling the Firebase APIs the project needs.
9. Firebase's free tier has email/usage quotas; inspect the project's quotas.
   Resend cooldown is a UX measure, Firebase applies delivery throttling. The
   existing password-reset limiter uses shared Redis if already configured,
   otherwise in-memory limiting is best effort on Vercel. No new paid service is
   provisioned; keep traffic within the available quotas.

## Environment variable names

Public website setting (defaults to the production domain above):
- NEXT_PUBLIC_SITE_URL

Required client:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Existing optional client metadata:
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

Required server:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

Existing login CAPTCHA:
- NEXT_PUBLIC_TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY

Optional existing shared reset rate limiter:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

NEXT_PUBLIC_SITE_URL is the only new optional environment setting. No new
secrets, packages, authentication providers, or backend infrastructure were added.

## Automated regression checks

Run node --test scripts/auth.test.cjs. These tests execute the actual TypeScript
routes/helpers with isolated Firebase fakes; they do not send real email or
modify production users. Coverage includes secure cookie attributes and TTL,
recent-auth/verified-email gates, legacy admin compatibility, forged roles,
cross-origin mint/logout/write rejection, revoked/expired tokens, safe errors,
cookie status across repeated reads, logout revocation and retry behavior,
transactional profile creation and preserved roles, admin demotion, protected-page
redirects, reset delivery endpoint payload, generic reset responses, throttling,
client signup/login/logout sequencing, email/password validation, and safe redirects.

## Required live acceptance tests

Use an email inbox you control. Register, test duplicate signup, confirm the
verification email arrives, open its link in the same and another browser, test
resend/cooldown and already verified state, and then log in. Check refresh/new
tab, orders/checkout/account guards, expiry and logout. Test wrong credentials,
disabled accounts and network failures. Request a reset, confirm inbox delivery,
use its link, retry the used link, and test invalid/expired codes. Change the
password with incorrect/correct current passwords; confirm old credentials fail
and prior sessions are rejected. Test an ordinary user against admin pages/APIs,
an existing admin against both, forged role attempts and logout. Deploy rules and
run the same role-write tests against Firestore. Repeat on the actual Vercel
production deployment.

These live email, Console, deployed Firestore-rule, and Vercel checks must not be
represented as passed by the mocked regression tests.

## References

- [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Firebase email verification and passwords](https://firebase.google.com/docs/auth/web/manage-users)
- [Firebase custom email action handlers](https://firebase.google.com/docs/auth/custom-email-handler)
- [Firebase reset-email REST endpoint](https://firebase.google.com/docs/reference/rest/auth#section-send-password-reset-email)

## Validation recorded during implementation

- TypeScript (npx tsc --noEmit): passed.
- ESLint covering all changed auth files and both auth test scripts: passed.
- Production build (npm run build): passed after network access was allowed for
  the project's existing Google fonts. No font/theme configuration was changed.
- Isolated regression suite: 44 tests passed, including production/localhost email URLs, preserved verification destinations, safe redirects, refreshed verification state, and recent-login handoff.
- Running production server: 19 route/API checks passed with
  node scripts/auth-smoke.cjs (start the production app on port 3010 first).
  Checks account/security/orders/checkout/admin guards, registration/action
  redirects, session status, origin rejection, missing-token rejection, profile
  rejection, logout cookie clearing, and anonymous admin API rejection.
  Next.js streaming redirects can return a 200 HTML shell containing the
  server-generated redirect; the smoke check verifies that redirect and absence
  of protected account content.
- All 108 generated browser JavaScript chunks were scanned for server private-key
  material and FIREBASE_PRIVATE_KEY code; neither was present.
- Mobile inspection at 390px: signup, logged-out verification with the original orders destination, and forgot-password screens fit without horizontal overflow. Empty signup and invalid recovery email show inline validation; input autocomplete attributes were checked. No live signup or email submission was performed.
- Browser inspection: signup's full-name/confirmation fields and existing GOSH
  styling, logged-out verification page, and real account-to-login redirect.
  The reset-code check displayed safe network error handling and a recovery link;
  the browser could not reach Firebase, so live invalid-code validation was
  not established.
- Full repository ESLint remains blocked by 28 errors and 12 warnings in
  unrelated existing product/promotion/config files. Those files were not changed
  to force lint success. This is separate from the passing auth-scoped lint.
- Real inbox delivery, consumed/expired valid action links, authenticated
  production admin login, deployed Firestore rules, and production Vercel sessions
  remain manual acceptance checks. No live account or credentials were provided
  for these tests, and no production accounts were created or modified.

## Files changed for authentication

- .env.example

- app/admin/login/page.tsx
- app/api/auth/ensure-profile/route.ts
- app/api/auth/password-reset/route.ts
- app/api/auth/session/route.ts
- app/api/auth/logout/route.ts
- app/layout.tsx
- app/login/page.tsx
- app/register/page.tsx
- app/verify-email/page.tsx
- app/forgot-password/page.tsx
- app/reset-password/page.tsx
- app/auth/action/page.tsx
- app/account/layout.tsx
- app/account/page.tsx
- app/account/security/page.tsx
- app/orders/layout.tsx
- app/checkout/layout.tsx
- components/Navbar.tsx
- components/admin/AdminAuthProvider.tsx
- components/admin/AdminHeader.tsx
- components/auth/AuthProvider.tsx
- components/auth/AuthShell.tsx
- components/auth/LogoutButton.tsx
- firestore.rules
- lib/auth/adminAuth.ts
- lib/auth/apiAuth.ts
- lib/auth/session.ts
- lib/auth/errors.ts
- lib/auth/config.ts
- lib/firebase/admin.ts
- lib/firebase/auth.ts
- lib/firebase/api-auth.ts
- lib/firebase/server-auth.ts
- lib/firebase/users.ts
- lib/firebase/users-server.ts
- scripts/auth.test.cjs
- scripts/auth-smoke.cjs
- AUTHENTICATION.md
