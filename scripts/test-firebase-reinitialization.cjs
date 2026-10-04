/* eslint-disable @typescript-eslint/no-require-imports */
// Re-evaluate the actual client configuration as Fast Refresh does. No network reads or writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { deleteApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

const sourceFile = path.join(__dirname, "../lib/firebase/config.ts");
const code = ts.transpileModule(fs.readFileSync(sourceFile, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// This test runs in its own process with an inert project, without loading .env.
for (const [key, value] of Object.entries({
  API_KEY: "runtime-regression-test-key",
  AUTH_DOMAIN: "runtime-regression-test.firebaseapp.com",
  PROJECT_ID: "runtime-regression-test",
  STORAGE_BUCKET: "runtime-regression-test.appspot.com",
  MESSAGING_SENDER_ID: "123456",
  APP_ID: "1:123456:web:runtime-regression-test",
})) process.env[`NEXT_PUBLIC_FIREBASE_${key}`] = value;

function evaluateConfig() {
  const refreshedModule = new Module(sourceFile);
  refreshedModule.filename = sourceFile;
  refreshedModule.paths = Module._nodeModulePaths(path.dirname(sourceFile));
  refreshedModule._compile(code, sourceFile);
  return refreshedModule.exports;
}

async function run() {
  const first = evaluateConfig();
  try {
    for (let reload = 0; reload < 3; reload++) {
      const refreshed = evaluateConfig();
      assert.equal(refreshed.default, first.default, "Reuse the Firebase app");
      assert.equal(refreshed.auth, first.auth, "Preserve the auth instance");
      assert.equal(refreshed.db, first.db, "Reuse the configured Firestore instance");
      assert.equal(getFirestore(refreshed.default), first.db);
    }
    console.log("PASS: repeated configuration evaluation preserves app, auth, and Firestore.");
  } finally {
    await deleteApp(first.default);
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
