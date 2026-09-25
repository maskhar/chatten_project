import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/admin/overview-tables.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { editorialTables, toActivityEntries, mergeActivity, summariseDrafts } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

test("every editorial table declares a title column and an admin href", () => {
  for (const entry of editorialTables) {
    assert.ok(entry.table.length > 0, `${entry.label} has no table`);
    assert.ok(entry.titleColumn.length > 0, `${entry.label} has no title column`);
    assert.ok(entry.href.startsWith("/admin/"), `${entry.label} href is not an admin route`);
  }
});

test("draft counting spans more than hero_slides", () => {
  // The bug A25 fixes: the old dashboard counted drafts in one table only.
  const tables = editorialTables.map((entry) => entry.table);
  for (const expected of ["menu_items", "events", "promotions", "gallery_items", "experiences", "spaces"]) {
    assert.ok(tables.includes(expected), `${expected} is missing from the draft sweep`);
  }
});

test("activity entries read the per-table title column", () => {
  const testimonials = editorialTables.find((entry) => entry.table === "testimonials");
  const rows = [{ author_name: "Rina", status: "published", updated_at: "2026-09-20T10:00:00Z" }];
  assert.equal(toActivityEntries(testimonials, rows)[0].label, "Rina");
});

test("a row with no title falls back rather than rendering undefined", () => {
  const gallery = editorialTables.find((entry) => entry.table === "gallery_items");
  const entry = toActivityEntries(gallery, [{ status: "draft", updated_at: "2026-09-20T10:00:00Z" }])[0];
  // The fallback is operator-facing copy, so it is Indonesian like the rest
  // of the dashboard; the status value stays the raw column value.
  assert.equal(entry.label, "Tanpa judul");
  assert.equal(entry.status, "draft");
});

test("merge sorts newest first, drops undated rows and honours the limit", () => {
  const groups = [
    [{ label: "old", href: "/admin/hero", group: "Hero slides", status: "draft", updatedAt: "2026-09-01T00:00:00Z" }],
    [{ label: "new", href: "/admin/events", group: "Events", status: "published", updatedAt: "2026-09-20T00:00:00Z" }],
    [{ label: "undated", href: "/admin/spaces", group: "Spaces", status: "draft", updatedAt: "" }],
  ];
  const merged = mergeActivity(groups, 5);
  assert.deepEqual(merged.map((row) => row.label), ["new", "old"]);
  assert.equal(mergeActivity(groups, 1).length, 1);
});

test("summary totals drafts across sections and orders by backlog", () => {
  const groups = [
    { label: "Hero slides", href: "/admin/hero", drafts: 0, total: 4 },
    { label: "Events", href: "/admin/events", drafts: 3, total: 5 },
    { label: "Menu items", href: "/admin/menu", drafts: 1, total: 20 },
  ];
  const summary = summariseDrafts(groups);
  assert.equal(summary.totalDrafts, 4);
  assert.equal(summary.totalRows, 29);
  assert.deepEqual(summary.pending.map((group) => group.label), ["Events", "Menu items"]);
});
