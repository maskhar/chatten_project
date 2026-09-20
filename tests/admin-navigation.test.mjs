import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// The CMS sidebar is the only way into most editors, so a manager that is not
// listed there is unreachable: it exists, it works, and no operator can find
// it. `moments` was exactly that — the homepage renders a "One place. Four
// different stories." section from chatten_cafe.moments, the generic editor
// at /admin/moments was fully functional, and nothing linked to it.

const layout = fs.readFileSync("app/admin/(dashboard)/layout.tsx", "utf8");
const resources = fs.readFileSync("lib/admin/resources.ts", "utf8");

const navHrefs = [...layout.matchAll(/"(\/admin\/[a-z-]+)"/g)].map((match) => match[1]);
const navKeys = new Set(navHrefs.map((href) => href.replace("/admin/", "")));

// Only top-level `{ key: ... }` entries in the resources array are resources;
// field declarations reuse the same shape, so match on the table that follows.
const resourceKeys = [...resources.matchAll(/\{ key: "([a-z-]+)", label: "[^"]*", table: "/g)].map((match) => match[1]);

test("the resource list was parsed, not silently empty", () => {
  assert.ok(resourceKeys.length >= 14, `only found ${resourceKeys.length} resources; the parse is wrong`);
  assert.ok(navHrefs.length >= 15, `only found ${navHrefs.length} nav links; the parse is wrong`);
});

test("every CMS resource is reachable from the sidebar", () => {
  const dedicated = new Set(["menu", "homepage", "media", "preview", "users", "account"]);
  for (const key of resourceKeys) {
    assert.ok(navKeys.has(key) || dedicated.has(key), `/admin/${key} is a working editor with no link in the sidebar`);
  }
});

test("moments specifically, since it renders on the home page", () => {
  const home = fs.readFileSync("app/(public)/page.tsx", "utf8");
  assert.match(home, /data\.moments\.map/, "the home page no longer renders moments; this test can go");
  assert.ok(navKeys.has("moments"), "the home page renders moments but the CMS has no link to edit them");
});

test("every sidebar link points at a route that exists", () => {
  for (const href of new Set(navHrefs)) {
    const key = href.replace("/admin/", "");
    const dedicated = path.join("app/admin/(dashboard)", key, "page.tsx");
    const generic = resourceKeys.includes(key);
    const retired = new RegExp(`"${key}":`).test(resources);
    assert.ok(fs.existsSync(dedicated) || generic || retired, `${href} is in the sidebar but resolves to nothing`);
  }
});

test("a dedicated manager is not also offered as a generic resource", () => {
  // /admin/menu-categories and /admin/menu-items used to bypass the menu
  // manager's delete protection and price parsing (A20). The redirect map is
  // what keeps them gone.
  for (const key of ["menu-categories", "menu-items"]) {
    assert.ok(!resourceKeys.includes(key), `${key} is a generic resource again, bypassing the dedicated manager`);
  }
  assert.match(resources, /retiredResourceRedirects/);
});

test("the sidebar has a mobile counterpart sharing one link list", () => {
  // A15: below 1024px the sidebar was `hidden … lg:block` with no other
  // control, so a phone could reach /admin but never move between sections.
  const nav = fs.readFileSync("components/admin/admin-nav.tsx", "utf8");
  assert.match(nav, /export function AdminMobileNav/);
  assert.match(nav, /export function AdminSidebar/);
  // Both render AdminNavLinks, so the two cannot drift apart.
  assert.equal((nav.match(/<AdminNavLinks/g) ?? []).length, 2);
  assert.match(layout, /<AdminMobileNav/);
  assert.match(layout, /<AdminSidebar/);
});

test("the mobile drawer is dismissible by keyboard and by choosing a link", () => {
  const nav = fs.readFileSync("components/admin/admin-nav.tsx", "utf8");
  assert.match(nav, /event\.key === "Escape"/);
  assert.match(nav, /onNavigate=\{\(\) => setOpen\(false\)\}/);
  assert.match(nav, /aria-modal="true"/);
  assert.match(nav, /aria-expanded=\{open\}/);
});

test("the only admin data table can scroll instead of overflowing a phone", () => {
  const users = fs.readFileSync("app/admin/(dashboard)/users/page.tsx", "utf8");
  assert.match(users, /overflow-x-auto/);
  assert.match(users, /min-w-\[720px\]/);
});

test("no two sidebar links point at the same page", () => {
  // /admin/contact was listed twice — "Visit Chatten" under Website and
  // "Contact & Location" under Settings — so one of the two was always the
  // highlighted one and the other looked broken.
  assert.equal(new Set(navHrefs).size, navHrefs.length, `duplicate sidebar link: ${navHrefs.filter((href, i) => navHrefs.indexOf(href) !== i).join(", ")}`);
});

test("the drag panel appears only where the reorder action will accept the table", () => {
  // opening_hours has a sort_order column but is unique on
  // (day_of_week, sort_order), so reorderResource refuses it. Deriving the
  // panel from the column alone gave the operator a control that dragged,
  // saved, failed, and rolled back every time.
  const page = fs.readFileSync("app/admin/(dashboard)/[resource]/page.tsx", "utf8");
  assert.match(page, /const sortable = ordered && isReorderableTable\(resource\.table\)/);
  assert.match(page, /const orderColumn = ordered \? "sort_order" : "created_at"/);
  assert.ok(!/const sortable = resource\.fields\.some/.test(page), "sortable is derived from the column again");

  const core = fs.readFileSync("lib/admin/reorder-core.ts", "utf8");
  assert.ok(!/"opening_hours"/.test(core), "opening_hours is reorderable again; the unique constraint says it must not be");
});

test("a resource only declares sort_order when the table still has the column", () => {
  // 20260910000200 dropped sort_order from events and promotions. The
  // registry kept declaring it, so saveResource would have built a payload
  // naming a column that no longer exists — latent only because the bespoke
  // routes shadow the generic form.
  const dropped = fs.readFileSync("supabase/migrations/20260910000200_remove_event_promotion_manual_ordering.sql", "utf8");
  for (const table of ["events", "promotions"]) {
    assert.match(dropped, new RegExp(`alter table [^;]*${table}[^;]*drop column[^;]*sort_order`, "is"), `the migration no longer drops ${table}.sort_order`);
    const block = resources.slice(resources.indexOf(`key: "${table}"`));
    const declaration = block.slice(0, block.indexOf("] },") + 4);
    assert.ok(!/key: "sort_order"/.test(declaration), `${table} declares a sort_order field inline`);
    assert.ok(!/\.\.\.editorial/.test(declaration), `${table} spreads ...editorial, which carries sort_order`);
  }
});

test("the content area leaves room for the fixed sidebar only where it exists", () => {
  // The sidebar is `fixed … lg:block`, so the offset must be lg-scoped too or
  // every page carries 16rem of dead left margin on a phone.
  assert.match(layout, /lg:pl-64/);
  assert.ok(!/ pl-64/.test(layout.replace(/lg:pl-64/g, "")), "an unscoped pl-64 would indent every phone page");
});
