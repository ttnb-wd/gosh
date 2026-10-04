/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const base = "http://localhost:3010";
  let passed = 0;
  for (const route of ["/login", "/admin/login", "/verify-email", "/forgot-password", "/reset-password"]) {
    const result = await fetch(base + route);
    assert.equal(result.status, 200, route);
    passed++;
  }
  for (const route of ["/account", "/account/security", "/orders", "/checkout", "/admin"]) {
    const result = await fetch(base + route, { redirect: "manual" });
    const target = route === "/admin" ? "/admin/login" : "/login";
    if (result.status === 307) assert.ok(result.headers.get("location").startsWith(target), route);
    else {
      // Next.js can stream an HTTP 200 shell before the async guard redirects.
      assert.equal(result.status, 200, route);
      const body = await result.text();
      assert.ok(body.includes('id="__next-page-redirect"') && body.includes("url=" + target), route);
      assert.ok(!body.includes('>Your Account<'), "Protected account content must not render");
    }
    passed++;
  }
  const signup = await fetch(base + "/register", { redirect: "manual" });
  if (signup.status === 307) assert.equal(signup.headers.get("location"), "/login?mode=signup");
  else {
    assert.equal(signup.status, 200, "/register");
    const body = await signup.text();
    assert.ok(body.includes('id="__next-page-redirect"') && body.includes("url=/login?mode=signup"));
  }
  passed++;
  const status = await fetch(base + "/api/auth/session");
  assert.equal(status.status, 401); assert.equal((await status.json()).user, null); passed++;
  const blocked = await fetch(base + "/api/auth/session", { method: "POST", headers: { Origin: "https://evil.test" } });
  assert.equal(blocked.status, 403); passed++;
  // HTTPS Origin matches production cookie policy while this local test server
  // is accessed over HTTP. No valid credential or production mutation is sent.
  const headers = { Origin: "https://localhost:3010" };
  const missing = await fetch(base + "/api/auth/session", { method: "POST", headers });
  assert.equal(missing.status, 401); passed++;
  const profile = await fetch(base + "/api/auth/ensure-profile", { method: "POST", headers });
  assert.equal(profile.status, 401); passed++;
  const logout = await fetch(base + "/api/auth/logout", { method: "POST", headers });
  assert.equal(logout.status, 200); assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0")); passed++;
  const admin = await fetch(base + "/api/admin/customers/summaries", { method: "POST", headers, body: "{}" });
  assert.equal(admin.status, 403); passed++;
  for (const [mode, target] of [["resetPassword", "/reset-password"], ["verifyEmail", "/verify-email"]]) {
    const result = await fetch(base + "/auth/action?mode=" + mode + "&oobCode=invalid-test-code", { redirect: "manual" });
    if (result.status === 307) assert.ok(result.headers.get("location").startsWith(target));
    else {
      assert.equal(result.status, 200, mode);
      const body = await result.text();
      assert.ok(body.includes('id="__next-page-redirect"') && body.includes("url=" + target));
    }
    passed++;
  }
  require("@next/env").loadEnvConfig(process.cwd());
  const key = process.env.FIREBASE_PRIVATE_KEY;
  assert.ok(key, "Server key is configured");
  const fragment = key.replace(/\\+n/g, "\n").split("\n").find(line => line.length > 30 && !line.startsWith("-----"));
  assert.ok(fragment, "Private-key scan has a valid fragment");
  let chunks = 0;
  function scan(folder) {
    for (const file of fs.readdirSync(folder, { withFileTypes: true })) {
      const target = path.join(folder, file.name);
      if (file.isDirectory()) scan(target);
      else if (/\.js$/.test(file.name)) {
        const content = fs.readFileSync(target, "utf8");
        assert.ok(!content.includes(fragment), "Private credential must not appear in browser JavaScript");
        assert.ok(!content.includes("FIREBASE_PRIVATE_KEY"), "Server credential code must not appear in browser JavaScript");
        chunks++;
      }
    }
  }
  scan(".next/static");
  console.log(passed + " production route/API checks passed; " + chunks + " browser chunks checked for server credential exposure.");
})().catch(error => { console.error(error.message); process.exitCode = 1; });
