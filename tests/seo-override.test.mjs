import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// lib/seo.ts imports lib/media/url.ts, which is a leaf with no dependencies, so
// both are transpiled and the import is rewritten to a data URL.
function load(path) {
  const src = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}
const urlModule = `data:text/javascript,${encodeURIComponent(load("../lib/media/url.ts"))}`;
const seoJs = load("../lib/seo.ts").replace(`"@/lib/media/url"`, JSON.stringify(urlModule));
const { publicMetadata, applySeoOverride } = await import(`data:text/javascript,${encodeURIComponent(seoJs)}`);

const APP_URL = "https://chatten.example";
process.env.NEXT_PUBLIC_APP_URL = APP_URL;
const base = () => publicMetadata("Menu", "Default description.", "/menu");

test("no CMS row leaves the page defaults untouched", () => {
  const result = applySeoOverride(base(), null, "/menu");
  assert.equal(result.title, "Menu | Chatten Cafe");
  assert.equal(result.description, "Default description.");
});

test("a blank column falls back instead of blanking the tag", () => {
  // An operator who clears a field should get the page default back, not an
  // empty title or an empty description in the markup.
  const result = applySeoOverride(base(), { title: "   ", description: "", canonical_url: null, og_media_id: null, robots: null }, "/menu");
  assert.equal(result.title, "Menu | Chatten Cafe");
  assert.equal(result.description, "Default description.");
});

test("a filled row overrides title, description and robots", () => {
  const result = applySeoOverride(base(), { title: "Our Menu", description: "Coffee and kitchen.", canonical_url: null, og_media_id: null, robots: "noindex" }, "/menu");
  assert.equal(result.title, "Our Menu | Chatten Cafe");
  assert.equal(result.description, "Coffee and kitchen.");
  assert.equal(result.robots, "noindex");
  assert.equal(result.openGraph.title, "Our Menu | Chatten Cafe");
});

test("canonical defaults to the app URL and can be overridden", () => {
  assert.equal(applySeoOverride(base(), { title: null, description: null, canonical_url: null, og_media_id: null, robots: null }, "/menu").alternates.canonical, `${APP_URL}/menu`);
  assert.equal(applySeoOverride(base(), { title: null, description: null, canonical_url: "https://elsewhere.example/menu", og_media_id: null, robots: null }, "/menu").alternates.canonical, "https://elsewhere.example/menu");
});

test("the OG image is absolutised because consumers are off-site", () => {
  // A6 routes media through the relative /api/media/<id>; a relative URL in an
  // og:image tag is useless to an external crawler.
  const result = applySeoOverride(base(), { title: null, description: null, canonical_url: null, og_media_id: "11111111-2222-3333-4444-555555555555", robots: null }, "/menu");
  assert.deepEqual(result.openGraph.images, [{ url: `${APP_URL}/api/media/11111111-2222-3333-4444-555555555555` }]);
});

test("no OG media leaves the inherited images alone", () => {
  const result = applySeoOverride(base(), { title: null, description: null, canonical_url: null, og_media_id: null, robots: null }, "/menu");
  assert.equal(result.openGraph.images, undefined);
});
