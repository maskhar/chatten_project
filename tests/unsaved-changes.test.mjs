import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/admin/unsaved-changes.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { shouldGuardNavigation, UNSAVED_MESSAGE } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const HERE = "https://chatten.example/admin/menu?page=2";
const intent = (overrides) => ({ href: null, target: null, hasDownload: false, modified: false, ...overrides });

test("leaving for another admin page is guarded", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery" }), HERE), true);
  assert.equal(shouldGuardNavigation(intent({ href: "https://chatten.example/" }), HERE), true);
});

test("a different page of the same list is still leaving", () => {
  // Pagination is a real navigation: the form on screen is replaced.
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/menu?page=3" }), HERE), true);
});

test("a same-page anchor only moves the scroll position", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "#top" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/menu?page=2#row" }), HERE), false);
});

test("a click that opens a new tab leaves this page alive", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", modified: true }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", target: "_blank" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "/admin/gallery", target: "_self" }), HERE), true);
});

test("downloads and non-http schemes do not navigate", () => {
  assert.equal(shouldGuardNavigation(intent({ href: "/api/media/abc", hasDownload: true }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "mailto:hi@chatten.example" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "tel:+628123" }), HERE), false);
});

test("an anchor with no or an unparseable href is not a navigation", () => {
  assert.equal(shouldGuardNavigation(intent({ href: null }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "" }), HERE), false);
  assert.equal(shouldGuardNavigation(intent({ href: "http://[" }), HERE), false);
});

test("the warning names the consequence", () => {
  assert.match(UNSAVED_MESSAGE, /unsaved changes/i);
});
