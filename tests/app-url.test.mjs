import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/env/app-url.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { checkAppUrl, ALLOW_MISSING_APP_URL } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

test("a missing value fails a production build", () => {
  const verdict = checkAppUrl(undefined, { production: true });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.fatal, true);
  assert.match(verdict.message, /sitemap/);
});

test("a missing value only warns outside production", () => {
  // `next dev` on localhost and a bare CI typecheck both run without it.
  const verdict = checkAppUrl(undefined, { production: false });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.fatal, false);
});

test("an empty or whitespace value counts as missing, not as malformed", () => {
  for (const raw of ["", "   "]) {
    const verdict = checkAppUrl(raw, { production: true });
    assert.equal(verdict.ok, false);
    assert.match(verdict.message, /is not set/);
  }
});

test("the escape hatch downgrades a missing value to a warning", () => {
  const verdict = checkAppUrl(undefined, { production: true, allowMissing: true });
  assert.equal(verdict.fatal, false);
  assert.match(checkAppUrl(undefined, { production: true }).message, new RegExp(ALLOW_MISSING_APP_URL));
});

test("a malformed value is fatal everywhere, escape hatch included", () => {
  // A typo is not an omission: lib/seo.ts calls `new URL()` on it per request.
  for (const options of [{ production: false }, { production: true }, { production: true, allowMissing: true }]) {
    const verdict = checkAppUrl("chatten.example", options);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.fatal, true);
  }
});

test("a non-http scheme is rejected", () => {
  const verdict = checkAppUrl("ftp://chatten.example", { production: false });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.fatal, true);
});

test("localhost passes in development and warns in a production build", () => {
  assert.equal(checkAppUrl("http://localhost:3000", { production: false }).ok, true);
  // Not fatal: `npm run build` on a developer machine is also NODE_ENV=production
  // and localhost is the right answer there. A47 guards the silent omission.
  const verdict = checkAppUrl("http://localhost:3000", { production: true });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.fatal, false);
  assert.match(verdict.message, /crawler/);
  assert.equal(checkAppUrl("http://127.0.0.1:3000", { production: true }).fatal, false);
});

test("a valid origin is normalised and passes", () => {
  assert.deepEqual(checkAppUrl("https://chatten.example/", { production: true }), { ok: true, url: "https://chatten.example" });
  // A trailing path is dropped: consumers resolve their own paths against it.
  assert.deepEqual(checkAppUrl("https://chatten.example/site", { production: true }), { ok: true, url: "https://chatten.example" });
});

test("next.config.ts runs the check before the build", () => {
  const config = fs.readFileSync("next.config.ts", "utf8");
  assert.match(config, /assertAppUrl\(\)/);
});
