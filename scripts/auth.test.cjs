/* eslint-disable @typescript-eslint/no-require-imports */
/* Auth regression tests: execute actual TS helpers/routes with isolated Firebase fakes.
 * No real users, messages, credentials, or production data are created.
 * Run: node --test scripts/auth.test.cjs
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextResponse } = require("next/server");

function fixture(options = {}) {
  const uid = "trusted-user";
  let claims = { uid, email: "real@example.test", email_verified: true, auth_time: Math.floor(Date.now() / 1000), ...options.claims };
  let profile = options.profile === undefined ? { role: "user", full_name: "Real User" } : options.profile;
  let revoked = false;
  const calls = [];
  const ref = { get: async () => ({ exists: !!profile, data: () => profile }) };
  const fail = (code) => Object.assign(new Error("PRIVATE INTERNAL DETAIL"), { code });
  const adminAuth = {
    verifyIdToken: async (token, check) => { calls.push(["id", token, check]); if (options.invalid || revoked) throw fail("auth/id-token-revoked"); return claims; },
    verifySessionCookie: async (token, check) => { calls.push(["session", token, check]); if (options.sessionCheckFailure) throw fail("auth/internal-error"); if (options.invalid || revoked) throw fail("auth/session-cookie-revoked"); return claims; },
    createSessionCookie: async (token, config) => { calls.push(["mint", token, config]); if (options.mintFailure) throw fail("auth/internal-error"); return "signed-session"; },
    revokeRefreshTokens: async (id) => { calls.push(["revoke", id]); if (options.revokeFailure) throw fail("auth/internal-error"); revoked = true; },
    getUser: async (id) => { calls.push(["user", id]); return { email: claims.email, emailVerified: claims.email_verified, displayName: "Real User" }; },
  };
  const adminDb = {
    collection: (name) => { calls.push(["collection", name]); return { doc: (id) => { calls.push(["doc", id]); return ref; } }; },
    runTransaction: async (fn) => fn({
      get: ref.get,
      update: (_ref, data) => { profile = { ...profile, ...data }; calls.push(["update", data]); },
      create: (_ref, data) => { profile = data; calls.push(["create", data]); },
    }),
  };
  const user = { uid, email: claims.email, emailVerified: claims.email_verified, getIdToken: async () => "trusted-id" };
  const auth = { currentUser: user };
  const sdk = {
    createUserWithEmailAndPassword: async (_auth, email, password) => { calls.push(["signup", email, password]); return { user }; },
    updateProfile: async (_user, data) => { Object.assign(user, data); calls.push(["display-name", data]); },
    signInWithEmailAndPassword: async (_auth, email, password) => { calls.push(["login", email, password]); return { user }; },
    reload: async (current) => { calls.push(["reload"]); if (options.reloadVerified !== undefined) current.emailVerified = options.reloadVerified; },
    sendEmailVerification: async (_user, settings) => { calls.push(["verification-email", settings]); },
    sendPasswordResetEmail: async (_auth, email, settings) => { calls.push(["reset-email", email, settings]); if (options.unknownEmail) throw fail("auth/user-not-found"); },
    signOut: async () => { calls.push(["signout"]); auth.currentUser = null; },
  };
  const fetchMock = async (url, init) => {
    calls.push(["fetch", url, init]);
    if (String(url).startsWith("https://identitytoolkit")) {
      return { ok: !options.resetError, json: async () => ({ error: { message: options.resetError } }) };
    }
    if (options.clientFetchFailure) return { ok: false, status: options.clientStatus || 503, json: async () => ({ code: options.clientFetchFailure }) };
    return { ok: true, json: async () => ({ success: true, profile }) };
  };
  const cache = new Map();
  const mocks = {
    "server-only": {},
    "next/server": { NextResponse },
    "next/headers": { cookies: async () => ({ get: () => options.noCookie ? undefined : { value: "signed-session" } }) },
    "next/navigation": { redirect: (location) => { throw Object.assign(new Error("redirect"), { location }); } },
    "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => "server-timestamp" } },
    "firebase/auth": sdk,
    "@/lib/firebase/admin": { adminAuth, adminDb },
    "@/lib/firebase/config": { auth },
    "@/lib/rateLimit": { checkRateLimit: async () => ({ success: !options.rateLimited }), createRateLimitId: () => "test", getClientIp: () => "127.0.0.1" },
  };
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loadedModule = { exports: {} };
    cache.set(absolute, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const customRequire = (name) => {
      if (mocks[name]) return mocks[name];
      let file = name.startsWith("@/") ? path.resolve(name.slice(2)) :
        name.startsWith(".") ? path.resolve(path.dirname(absolute), name) : null;
      if (file) {
        if (file.endsWith(path.join("firebase", "admin"))) return { adminAuth, adminDb };
        if (file.endsWith(path.join("firebase", "config"))) return { auth };
        return load(file + ".ts");
      }
      return require(name);
    };
    const context = vm.createContext({
      exports: loadedModule.exports, module: loadedModule, require: customRequire, process: { env: { NODE_ENV: options.production ? "production" : "test", NEXT_PUBLIC_SITE_URL: options.siteUrl, NEXT_PUBLIC_FIREBASE_API_KEY: "public-test-key" } },
      console: { log() {}, warn() {}, error() {} }, URL, URLSearchParams, TypeError, Request, Response, Date, AbortSignal,
      fetch: fetchMock, window: { location: { origin: options.browserOrigin || "https://www.goshperfumestudio.com" }, dispatchEvent: () => calls.push(["auth-changed"]) }, Event,
    });
    new vm.Script(code, { filename: absolute }).runInContext(context);
    return loadedModule.exports;
  }
  return { load, calls, profile: () => profile, claims: (value) => { claims = value; } };
}
function request(method = "POST", headers = {}, body) {
  return new Request("https://goshperfume.com/api/auth/session", {
    method, headers: { origin: "https://goshperfume.com", authorization: "Bearer trusted-id", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const sessionPath = "app/api/auth/session/route.ts";
test("session: verified login creates a production-secure 24h cookie", async () => {
  const f = fixture({ production: true });
  const result = await f.load(sessionPath).POST(request());
  assert.equal(result.status, 200);
  const cookie = result.headers.get("set-cookie");
  for (const marker of ["firebase-session=signed-session", "HttpOnly", "Secure", "SameSite=lax", "Path=/", "Max-Age=86400"]) assert.ok(cookie.includes(marker), marker);
  assert.equal(f.calls.find(x => x[0] === "id")[2], true);
});
test("session: development cookie permits local HTTP", async () => {
  const f = fixture();
  const result = await f.load(sessionPath).POST(request());
  assert.ok(!result.headers.get("set-cookie").includes("Secure"));
});
test("session: unverified ordinary user is rejected without a cookie", async () => {
  const f = fixture({ claims: { email_verified: false } });
  const result = await f.load(sessionPath).POST(request());
  assert.equal(result.status, 403); assert.equal(result.headers.get("set-cookie"), null);
});
test("session: legacy unverified admin remains supported by server role", async () => {
  const f = fixture({ claims: { email_verified: false }, profile: { role: "admin" } });
  assert.equal((await f.load(sessionPath).POST(request())).status, 200);
});
test("session: body role=admin does not bypass verification", async () => {
  const f = fixture({ claims: { email_verified: false } });
  assert.equal((await f.load(sessionPath).POST(request("POST", {}, { role: "admin", uid: "admin" }))).status, 403);
});
for (const headers of [{ origin: "https://evil.test" }, { origin: "" }, { "sec-fetch-site": "cross-site" }]) {
  test("session: rejects cross-origin or missing-origin mint and logout " + JSON.stringify(headers), async () => {
    const f = fixture(); const route = f.load(sessionPath);
    assert.equal((await route.POST(request("POST", headers))).status, 403);
    assert.equal((await route.DELETE(request("DELETE", headers))).status, 403);
    assert.equal(f.calls.length, 0);
  });
}
test("session: missing bearer is rejected", async () => {
  assert.equal((await fixture().load(sessionPath).POST(request("POST", { authorization: "" }))).status, 401);
});
test("session: stale authentication cannot mint a cookie", async () => {
  const f = fixture({ claims: { auth_time: Math.floor(Date.now() / 1000) - 301 } });
  assert.equal((await f.load(sessionPath).POST(request())).status, 401);
});
test("session: revoked ID token rejected safely", async () => {
  const result = await fixture({ invalid: true }).load(sessionPath).POST(request());
  assert.equal(result.status, 401); assert.ok(!JSON.stringify(await result.json()).includes("PRIVATE"));
});
test("session: signing/config failures return safe 503", async () => {
  const result = await fixture({ mintFailure: true }).load(sessionPath).POST(request());
  assert.equal(result.status, 503); assert.ok(!JSON.stringify(await result.json()).includes("PRIVATE"));
});
test("session: refresh/new tab reads the same cookie without a bearer", async () => {
  const f = fixture(); const route = f.load(sessionPath);
  for (let i = 0; i < 2; i++) {
    const result = await route.GET(request("GET", { authorization: "", cookie: "firebase-session=signed-session" }));
    assert.equal((await result.json()).status, "authenticated");
    assert.equal(result.headers.get("cache-control"), "private, no-store");
  }
});
test("session: expired/revoked session reports unauthenticated", async () => {
  const f = fixture({ invalid: true });
  const result = await f.load(sessionPath).GET(request("GET", { cookie: "firebase-session=expired" }));
  assert.equal(result.status, 401); assert.equal((await result.json()).user, null);
});
test("logout: revokes tokens, clears cookie, rejects subsequent protected API", async () => {
  const f = fixture(); const result = await f.load(sessionPath).DELETE(request("DELETE", { cookie: "firebase-session=signed-session" }));
  assert.equal(result.status, 200); assert.ok(result.headers.get("set-cookie").includes("Max-Age=0"));
  assert.deepEqual(f.calls.find(x => x[0] === "revoke"), ["revoke", "trusted-user"]);
  assert.equal(await f.load("lib/auth/apiAuth.ts").getAuthenticatedUser(request()), null);
});
test("logout: expired session and malformed cookie still clear safely", async () => {
  for (const cookie of ["firebase-session=expired", "firebase-session=%INVALID"]) {
    const result = await fixture({ invalid: true }).load(sessionPath).DELETE(request("DELETE", { cookie }));
    assert.equal(result.status, 200); assert.ok(result.headers.get("set-cookie").includes("Max-Age=0"));
  }
});
test("logout: failed revocation remains retryable and does not claim success", async () => {
  const f = fixture({ revokeFailure: true });
  const result = await f.load(sessionPath).DELETE(request("DELETE", { cookie: "firebase-session=signed-session" }));
  assert.equal(result.status, 503); assert.equal(result.headers.get("set-cookie"), null);
});
test("profile: forged identity/role ignored; trusted user profile created", async () => {
  const f = fixture({ profile: null, claims: { email_verified: false } });
  const result = await f.load("app/api/auth/ensure-profile/route.ts").POST(request("POST", {}, { role: "admin", uid: "forged", email: "fake@test.invalid" }));
  assert.equal(result.status, 200); assert.equal(f.profile().role, "user");
  assert.equal(f.profile().id, "trusted-user"); assert.equal(f.profile().email, "real@example.test");
  assert.ok(!("password" in f.profile())); assert.equal(f.profile().emailVerified, false);
});
test("profile: existing admin and legacy customer roles are preserved", async () => {
  for (const role of ["admin", "customer"]) {
    const f = fixture({ profile: { role, full_name: "Existing Name", created_at: "original" } });
    await f.load("app/api/auth/ensure-profile/route.ts").POST(request());
    assert.equal(f.profile().role, role); assert.equal(f.profile().full_name, "Existing Name");
    assert.equal(f.profile().created_at, "original");
  }
});
test("admin: ordinary user and body/header forged roles rejected", async () => {
  const f = fixture(); const helper = f.load("lib/auth/apiAuth.ts");
  const result = await helper.checkAdminApiAuth(request("POST", { role: "admin" }, { role: "admin", uid: "other" }));
  assert.equal(result.isAdmin, false);
});
test("admin: server profile allows admin, demotion takes effect immediately", async () => {
  const profile = { role: "admin" }; const f = fixture({ profile });
  const helper = f.load("lib/auth/apiAuth.ts");
  assert.equal((await helper.checkAdminApiAuth(request())).isAdmin, true);
  profile.role = "user"; assert.equal((await helper.checkAdminApiAuth(request())).isAdmin, false);
});
test("protected API: cookie writes require same origin", async () => {
  const helper = fixture().load("lib/auth/apiAuth.ts");
  assert.equal(await helper.getAuthenticatedUser(request("POST", { authorization: "", cookie: "firebase-session=signed", origin: "https://evil.test" })), null);
  assert.ok(await helper.getAuthenticatedUser(request("POST", { authorization: "", cookie: "firebase-session=signed" })));
});
test("protected page: missing/invalid session redirects to login", async () => {
  for (const options of [{ noCookie: true }, { invalid: true }]) {
    await assert.rejects(fixture(options).load("lib/auth/session.ts").requireAuth("/orders"),
      error => error.location === "/login?redirect=%2Forders");
  }
});
test("protected page: unverified session redirects to verification", async () => {
  await assert.rejects(fixture({ claims: { email_verified: false } }).load("lib/auth/session.ts").requireAuth(),
    error => error.location === "/verify-email?redirect=%2Faccount");
});
test("reset email: calls Firebase delivery endpoint with PASSWORD_RESET", async () => {
  const f = fixture();
  const result = await f.load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "real@example.test" }));
  assert.equal(result.status, 200);
  const call = f.calls.find(x => x[0] === "fetch");
  assert.ok(call[1].includes("accounts:sendOobCode"));
  assert.equal(JSON.parse(call[2].body).requestType, "PASSWORD_RESET");
});
test("reset email: known and unknown accounts have identical success response", async () => {
  const a = await fixture().load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "real@example.test" }));
  const b = await fixture({ resetError: "EMAIL_NOT_FOUND" }).load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "unknown@example.test" }));
  assert.deepEqual(await a.json(), await b.json());
});
test("reset email: rate limit and provider failure are surfaced safely", async () => {
  assert.equal((await fixture({ rateLimited: true }).load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "real@example.test" }))).status, 429);
  assert.equal((await fixture({ resetError: "INTERNAL_ERROR" }).load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "real@example.test" }))).status, 503);
});
test("client: signup saves display name, synchronizes profile, then sends verification", async () => {
  const f = fixture({ claims: { email_verified: false } }); await f.load("lib/firebase/auth.ts").signUpWithEmail(" real@example.test ", "Secure123", " Real User ");
  const names = f.calls.map(x => x[0]);
  assert.ok(names.indexOf("signup") < names.indexOf("display-name"));
  assert.ok(names.indexOf("display-name") < names.findLastIndex(x => x === "fetch"));
  assert.ok(names.findLastIndex(x => x === "fetch") < names.indexOf("verification-email"));
});
test("client: login uses Firebase email/password; no raw token is persisted", async () => {
  const f = fixture(); await f.load("lib/firebase/auth.ts").signInWithEmail(" real@example.test ", "Secure123");
  assert.deepEqual(f.calls.find(x => x[0] === "login"), ["login", "real@example.test", "Secure123"]);
});
test("client: logout clears server session before signing out browser", async () => {
  const f = fixture(); await f.load("lib/firebase/auth.ts").signOutUser();
  assert.ok(f.calls[0][1].includes("/api/auth/logout")); assert.equal(f.calls[1][0], "signout");
});
test("client: failed server logout does not claim completed logout", async () => {
  const f = fixture({ clientFetchFailure: "failure" });
  await assert.rejects(f.load("lib/firebase/auth.ts").signOutUser());
  assert.ok(!f.calls.some(x => x[0] === "signout"));
});
test("validation: invalid email, weak password, valid password", () => {
  const v = fixture().load("lib/validation.ts");
  assert.equal(v.validateEmail("invalid").isValid, false);
  assert.equal(v.validateEmail("real@example.test").isValid, true);
  for (const value of ["", "a1", "abcdefgh", "12345678"]) assert.equal(v.validatePassword(value).isValid, false);
  assert.equal(v.validatePassword("Secure123").isValid, true);
});
test("errors: credentials are generic; duplicate/expired codes are useful; raw errors hidden", () => {
  const e = fixture().load("lib/auth/errors.ts");
  for (const code of ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"]) assert.equal(e.getAuthErrorMessage({ code }), "Invalid email or password.");
  assert.equal(e.getAuthErrorMessage({ code: "auth/email-already-in-use" }), "An account already exists with this email. Please sign in instead.");
  for (const code of ["auth/expired-action-code", "auth/invalid-action-code"]) assert.ok(e.getAuthErrorMessage({ code }).includes("expired"));
  assert.equal(e.getAuthErrorMessage(new Error("SECRET DETAILS")), "Something went wrong. Please try again.");
});
test("redirect: blocks external, protocol-relative, backslash, control, and admin destinations", () => {
  const e = fixture().load("lib/auth/errors.ts");
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\nevil"]) assert.equal(e.safeAuthRedirect(value), "/account");
  assert.equal(e.safeAuthRedirect("/admin/products"), "/");
  assert.equal(e.safeAuthRedirect("/orders"), "/orders");
});

test("logout: verification outage does not masquerade as an expired cookie", async () => {
  const result = await fixture({ sessionCheckFailure: true }).load(sessionPath).DELETE(request("DELETE", { cookie: "firebase-session=signed-session" }));
  assert.equal(result.status, 503); assert.equal(result.headers.get("set-cookie"), null);
});

test("email URL: production domain is centralized and ignores browser origins", () => {
  const c = fixture({ production: true }).load("lib/auth/config.ts");
  assert.equal(c.getAuthSiteUrl("http://localhost:3000"), "https://www.goshperfumestudio.com");
  assert.equal(c.getEmailActionUrl("/login", "https://evil.test"), "https://www.goshperfumestudio.com/login");
});
test("email URL: environment setting and localhost development work", () => {
  const c = fixture({ siteUrl: "https://www.goshperfumestudio.com" }).load("lib/auth/config.ts");
  assert.equal(c.getAuthSiteUrl("http://localhost:3000"), "http://localhost:3000");
  assert.equal(c.getAuthSiteUrl("http://127.0.0.1:3001"), "http://127.0.0.1:3001");
  assert.equal(c.getAuthSiteUrl("https://preview.example.test"), "https://www.goshperfumestudio.com");
});
test("verification continuation: preserves destination without external/auth redirects", () => {
  const c = fixture().load("lib/auth/config.ts");
  assert.equal(c.getVerificationDestination(null, "https://www.goshperfumestudio.com/verify-email?redirect=%2Forders"), "/orders");
  assert.equal(c.getVerificationDestination("//evil.test", null), "/account");
  assert.equal(c.getVerificationDestination("/verify-email", null), "/account");
  assert.ok(c.verificationPath("/checkout", "sent").includes("redirect=%2Fcheckout"));
});
test("verification: SDK state is reloaded before server session is created", async () => {
  const f = fixture({ claims: { email_verified: false }, reloadVerified: true });
  assert.equal(await f.load("lib/firebase/auth.ts").completeEmailVerification({ emailVerified: false, getIdToken: async () => "fresh-id" }), true);
  assert.equal(f.calls[0][0], "reload");
  assert.ok(f.calls.find(x => x[0] === "fetch" && x[1] === "/api/auth/ensure-profile"));
  assert.ok(f.calls.find(x => x[0] === "fetch" && x[1] === "/api/auth/session"));
});
test("verification: still-unverified account cannot mint a session", async () => {
  const f = fixture({ claims: { email_verified: false } });
  assert.equal(await f.load("lib/firebase/auth.ts").completeEmailVerification({ emailVerified: false }), false);
  assert.ok(!f.calls.some(x => x[0] === "fetch"));
});
test("verification: resend skips already verified accounts", async () => {
  const f = fixture();
  assert.equal(await f.load("lib/firebase/auth.ts").sendVerificationEmail({ emailVerified: true }), false);
  assert.ok(!f.calls.some(x => x[0] === "verification-email"));
});
test("verification: stale sign-in produces a safe reauthentication state", async () => {
  const f = fixture({ clientFetchFailure: "failure", clientStatus: 401 });
  await assert.rejects(f.load("lib/firebase/auth.ts").createServerSession({ getIdToken: async () => "fresh-id" }),
    error => error.code === "auth/requires-recent-login");
});
test("reset email: real Firebase delivery carries the production return URL", async () => {
  const f = fixture({ production: true });
  await f.load("app/api/auth/password-reset/route.ts").POST(request("POST", {}, { email: "real@example.test" }));
  assert.equal(JSON.parse(f.calls.find(x => x[0] === "fetch")[2].body).continueUrl, "https://www.goshperfumestudio.com/login");
});
test("friendly errors: network and weak passwords have useful nontechnical wording", () => {
  const e = fixture().load("lib/auth/errors.ts");
  assert.equal(e.getAuthErrorMessage({ code: "auth/network-request-failed" }), "We couldn’t connect right now. Please try again.");
  assert.ok(e.getAuthErrorMessage({ code: "auth/weak-password" }).includes("8–128"));
  assert.ok(!e.getAuthErrorMessage({ code: "auth/internal-error", message: "PRIVATE TOKEN" }).includes("PRIVATE"));
});
