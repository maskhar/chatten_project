import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/public-data/navigation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { navigationLinks, isCurrentPath, FALLBACK_NAVIGATION } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

test("the fallback reaches every public content page", () => {
  // A34: /about and /events were finished pages with no link anywhere.
  const hrefs = FALLBACK_NAVIGATION.map((item) => item.href);
  for (const href of ["/about", "/experience", "/menu", "/spaces", "/events", "/gallery", "/visit"]) {
    assert.ok(hrefs.includes(href), `${href} is unreachable from the navigation`);
  }
});

test("CMS rows replace the fallback entirely", () => {
  const links = navigationLinks([{ label: "Menu", href: "/menu", sort_order: 1 }]);
  assert.deepEqual(links, [{ label: "Menu", href: "/menu", sort_order: 1 }]);
});

test("an empty or missing table falls back rather than rendering no nav", () => {
  assert.deepEqual(navigationLinks([]), [...FALLBACK_NAVIGATION]);
  assert.deepEqual(navigationLinks(null), [...FALLBACK_NAVIGATION]);
  assert.deepEqual(navigationLinks(undefined), [...FALLBACK_NAVIGATION]);
});

test("rows are ordered by sort_order regardless of arrival order", () => {
  const links = navigationLinks([
    { label: "Visit", href: "/visit", sort_order: 3 },
    { label: "About", href: "/about", sort_order: 1 },
    { label: "Menu", href: "/menu", sort_order: 2 },
  ]);
  assert.deepEqual(links.map((item) => item.href), ["/about", "/menu", "/visit"]);
});

test("incomplete and hidden rows are dropped", () => {
  // An editor reading via cms_manage sees inactive rows the public policy hides.
  const links = navigationLinks([
    { label: "Menu", href: "/menu", sort_order: 1 },
    { label: "", href: "/broken", sort_order: 2 },
    { label: "Hidden", href: "/hidden", sort_order: 3, is_active: false },
  ]);
  assert.deepEqual(links.map((item) => item.href), ["/menu"]);
});

test("the current page is marked, including its detail routes", () => {
  assert.equal(isCurrentPath("/events", "/events"), true);
  assert.equal(isCurrentPath("/events", "/events/night-market"), true);
  assert.equal(isCurrentPath("/events", "/eventsomething"), false);
  assert.equal(isCurrentPath("/menu", "/events"), false);
});

test("home is only current on home", () => {
  assert.equal(isCurrentPath("/", "/"), true);
  assert.equal(isCurrentPath("/", "/menu"), false);
});
