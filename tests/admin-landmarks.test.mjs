// A92. Everything this file pins is invisible in a screenshot, which is exactly
// why it kept regressing: a skip link that points at nothing looks identical to
// one that works, and two `<nav>` landmarks with no names look identical to two
// with names. Nothing in a visual review, a typecheck or a build can tell the
// difference. So the contract is asserted against the source text.
//
// These are source-contract tests rather than render tests because the admin
// shell is a Server Component that calls requireAdmin() — rendering it needs a
// Supabase session, and a test that needs a live session is a test that gets
// skipped. The properties here are structural, so reading the structure is
// enough to hold them.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const control = read("components/ui/control.ts");
const layout = read("app/admin/(dashboard)/layout.tsx");
const nav = read("components/admin/admin-nav.tsx");
const users = read("app/admin/(dashboard)/users/page.tsx");

// Comments have to go before any markup is matched, for the same reason
// tests/palette.test.mjs strips them: the note explaining *why* the scroll
// container is now a region quotes `<div role="region">`, and an element-shaped
// regex will happily match the quotation instead of the element — passing or
// failing on prose rather than on code.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const usersCode = stripComments(users);

test("the skip link and its target are named in one place", () => {
  // The two halves of a skip link live in different files: the `href` in the
  // layout, the `id` on `<main>`. A literal `href="#admin-main"` next to a
  // renamed `<main>` is the failure mode — the link still renders, still
  // focuses, and does nothing at all. One exported constant makes that
  // impossible.
  assert.match(control, /export const ADMIN_MAIN_ID = "admin-main"/);
  assert.match(control, /export const SKIP_LINK\b/);
  assert.match(layout, /ADMIN_MAIN_ID, SKIP_LINK/, "the layout must use the shared names");
  assert.match(layout, /href=\{`#\$\{ADMIN_MAIN_ID\}`\}/, "the skip link must derive its target from ADMIN_MAIN_ID");
  assert.match(layout, /className=\{SKIP_LINK\}/);
  assert.ok(
    !/href="#admin-main"/.test(layout),
    "the skip link hardcodes its target again; a renamed <main> would break it silently",
  );
});

test("the skip link is reachable by sighted keyboard users, not only screen readers", () => {
  // `sr-only` alone leaves it permanently invisible. A sighted keyboard user
  // then tabs onto a control they cannot see, which is worse than not having
  // one: focus disappears from the page entirely.
  const line = control.match(/export const SKIP_LINK[\s\S]*?;/)?.[0] ?? "";
  assert.match(line, /\bsr-only\b/);
  assert.match(line, /focus:not-sr-only/, "the skip link never becomes visible");
  assert.match(line, /focus:min-h-11/, "the revealed skip link is under the 44px minimum");
});

test("the skip link is the first focusable thing in the admin shell", () => {
  // A skip link that comes after the sidebar skips nothing. Position is the
  // whole mechanism, so it is asserted as an ordering, not as presence.
  const skipAt = layout.indexOf("className={SKIP_LINK}");
  const sidebarAt = layout.indexOf("<AdminSidebar");
  assert.ok(skipAt > -1 && sidebarAt > -1, "the layout no longer renders both the skip link and the sidebar");
  assert.ok(skipAt < sidebarAt, "the skip link now comes after the sidebar, so it skips nothing");
});

test("<main> can actually receive focus", () => {
  // Without tabIndex={-1} most browsers scroll to the target but leave focus
  // where it was, so the next Tab returns to the link *after* the skip link —
  // back at the top of the sidebar. The jump appears to work and does not.
  assert.match(layout, /<main\s+id=\{ADMIN_MAIN_ID\}\s+tabIndex=\{-1\}/);
  // The focusable <main> must not then paint an outline around the whole page
  // on every navigation — the ring belongs on controls, not on the container.
  assert.match(layout, /<main[^>]*className="[^"]*outline-none/);
});

test("both admin nav landmarks are named, with ids that cannot collide", () => {
  // The desktop sidebar and the mobile drawer can both be mounted at once
  // (the drawer is `lg:hidden`, the sidebar `lg:block` — CSS hides one, the DOM
  // holds both). A shared id would make aria-labelledby on the second resolve
  // to the first's heading, and a duplicated id is invalid besides.
  assert.match(nav, /<nav aria-labelledby=\{`\$\{navId\}-heading`\}/);
  assert.match(nav, /<h2 id=\{`\$\{navId\}-heading`\} className="sr-only">Navigasi CMS<\/h2>/);
  assert.match(nav, /navId="admin-sidebar-nav"/);
  assert.match(nav, /navId="admin-drawer-nav"/);
});

test("nav group titles are headings, and their links are a labelled list", () => {
  // As `<p>` the group titles were absent from the heading list, so a screen
  // reader user could not jump between groups; and the links were bare, so
  // group membership was conveyed only by the gap between them.
  assert.match(nav, /<h3 id=\{id\}/, "group titles are no longer headings");
  assert.match(nav, /<ul aria-labelledby=\{id\}/, "group links are no longer a list labelled by their heading");
  assert.ok(!/<p[^>]*>\{title\}<\/p>/.test(nav), "a group title went back to being a <p>");
});

test("the users table says what it is and which column each cell belongs to", () => {
  // "Admin" under "Peran saat ini" and "Admin" under "Tetapkan" are different
  // facts — the current role and a pending change. Without scope, reading a
  // cell does not say which one it is.
  assert.match(usersCode, /<caption/, "the members table has no caption");
  assert.match(usersCode, /<th scope="col"/);
  assert.match(usersCode, /<th scope="row"/, "the row's identifying cell is not a row header");
  const colHeaders = usersCode.match(/<th scope="col"/g) ?? [];
  assert.equal(colHeaders.length, 4, `expected 4 scoped column headers, found ${colHeaders.length}`);
});

test("the users table's scroll container is focusable and named", () => {
  // `overflow-x-auto` on a non-focusable div is scrollable by mouse and trackpad
  // and by nothing else: a keyboard user cannot reach the clipped columns at all.
  const region = usersCode.match(/<div\s+role="region"[\s\S]*?>/)?.[0] ?? "";
  assert.ok(region, "the scroll container is no longer a region");
  assert.match(region, /aria-label="/, "an unnamed region is announced as just 'region'");
  assert.match(region, /tabIndex=\{0\}/, "the scroll container cannot be focused, so it cannot be scrolled");
  assert.match(region, /overflow-x-auto/);
  assert.match(region, /focus-visible:ring/, "a focusable container with no visible focus is a keyboard trap in practice");
});

test("per-row controls name their row", () => {
  // Out of the table context — in a screen reader's controls list, or on a
  // narrow viewport — "Simpan" and "Hapus peran" do not say whose role.
  assert.match(users, /aria-label=\{`Peran untuk \$\{user\.email\}`\}/);
  assert.match(users, /aria-label=\{`Simpan peran untuk \$\{user\.email\}`\}/);
  assert.match(users, /aria-label=\{`Hapus peran \$\{roleLabel\} dari \$\{user\.email\}`\}/);
});
