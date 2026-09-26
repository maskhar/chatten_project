import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const src = fs.readFileSync(new URL("../lib/admin/list-query.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { PAGE_SIZE, parseListQuery, searchableColumns, escapeSearchTerm, buildSearchFilter, resourceHasStatus, pageRange, paginationState, listHref } = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const resource = {
  key: "menu-items",
  label: "Menu items",
  table: "menu_items",
  fields: [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "price", label: "Price", type: "number" },
    { key: "image_media_id", label: "Image", type: "media" },
    { key: "is_active", label: "Active", type: "checkbox" },
    { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
  ],
};

test("a hostile or absent page number falls back to 1", () => {
  for (const value of [undefined, "", "0", "-4", "abc", "1.9", "NaN"]) {
    assert.equal(parseListQuery({ page: value }).page, 1, `page=${value}`);
  }
  assert.equal(parseListQuery({ page: "7" }).page, 7);
  assert.equal(parseListQuery({ page: ["3", "9"] }).page, 3);
});

test("status accepts only the two schema values", () => {
  assert.equal(parseListQuery({ status: "draft" }).status, "draft");
  assert.equal(parseListQuery({ status: "published" }).status, "published");
  assert.equal(parseListQuery({ status: "deleted" }).status, "");
  assert.equal(parseListQuery({}).status, "");
});

test("search is trimmed and length-capped", () => {
  assert.equal(parseListQuery({ q: "  latte  " }).search, "latte");
  assert.equal(parseListQuery({ q: "x".repeat(500) }).search.length, 100);
});

test("only text-ish columns are searched", () => {
  assert.deepEqual(searchableColumns(resource), ["name", "description"]);
});

test("PostgREST metacharacters in a search term are escaped", () => {
  // An unescaped comma would be read as an `or=` separator and % / _ are ilike
  // wildcards, so either could silently change what the query matches.
  assert.equal(escapeSearchTerm("a,b"), "a\\,b");
  assert.equal(escapeSearchTerm("50%"), "50\\%");
  assert.equal(escapeSearchTerm("a_b"), "a\\_b");
  assert.equal(escapeSearchTerm("f(x)"), "f\\(x\\)");
});

test("search filter spans every searchable column", () => {
  assert.equal(buildSearchFilter(resource, "kopi"), "name.ilike.%kopi%,description.ilike.%kopi%");
  assert.equal(buildSearchFilter(resource, "   "), "");
  assert.equal(buildSearchFilter({ ...resource, fields: [{ key: "price", label: "Price", type: "number" }] }, "kopi"), "");
});

test("status filtering is offered only where the table has the column", () => {
  assert.equal(resourceHasStatus(resource), true);
  assert.equal(resourceHasStatus({ ...resource, fields: [{ key: "name", label: "Name" }] }), false);
});

test("range is inclusive at both ends, as PostgREST expects", () => {
  assert.deepEqual(pageRange(1, 25), { from: 0, to: 24 });
  assert.deepEqual(pageRange(3, 25), { from: 50, to: 74 });
});

test("pagination clamps a page past the end instead of showing nothing", () => {
  const state = paginationState(30, 9, 25);
  assert.equal(state.pageCount, 2);
  assert.equal(state.current, 2);
  assert.equal(state.hasNext, false);
  assert.equal(state.hasPrevious, true);
  assert.equal(state.from, 26);
  assert.equal(state.to, 30);
});

test("an empty table reports one page and no rows", () => {
  const state = paginationState(0, 1, 25);
  assert.equal(state.pageCount, 1);
  assert.equal(state.from, 0);
  assert.equal(state.to, 0);
  assert.equal(state.hasNext, false);
});

test("links carry the active filters and omit page 1", () => {
  const query = { search: "kopi", status: "draft", page: 2 };
  assert.equal(listHref("/admin/menu-items", query), "/admin/menu-items?q=kopi&status=draft&page=2");
  assert.equal(listHref("/admin/menu-items", query, { page: 1 }), "/admin/menu-items?q=kopi&status=draft");
  assert.equal(listHref("/admin/menu-items", { search: "", status: "", page: 1 }), "/admin/menu-items");
});

test("page size is a positive integer", () => {
  assert.ok(Number.isInteger(PAGE_SIZE) && PAGE_SIZE > 0);
});
