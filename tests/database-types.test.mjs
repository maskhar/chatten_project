import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A52: types/database.ts was a placeholder — `Record<string, unknown>` for
// every table — so supabase-js accepted any table name and any column. That is
// the root cause that let A1 ship: a query naming a column the schema did not
// have typechecked cleanly and failed only at runtime. These tests pin the
// properties that make the generated types actually load-bearing, so the file
// cannot quietly regress to a placeholder again.

const types = fs.readFileSync("types/database.ts", "utf8");
const tables = fs.readFileSync("types/tables.ts", "utf8");

test("the generated types are real, not a Record<string, unknown> placeholder", () => {
  assert.ok(!/Tables:\s*Record<string,\s*Table>/.test(types), "Tables must be a literal map of table names");
  // A named table with named columns is the whole point.
  assert.match(types, /menu_items:\s*\{/);
  assert.match(types, /category_id:\s*string/);
});

test("the schema changes from Phase 11 are present", () => {
  // The FKs from 20260921000500 appear as Relationships entries; their absence
  // means the file was generated before that migration was applied.
  assert.match(types, /events_image_media_id_fkey/);
  assert.match(types, /seo_settings_og_media_id_fkey/);
  // A62 dropped this column.
  assert.ok(!/map_url/.test(types), "contact_information.map_url was dropped and must not reappear");
});

test("TableName is derived from the generated types, not hand-listed", () => {
  assert.match(tables, /keyof Schema\["Tables"\]/);
  // A hand-maintained union would drift from the schema silently.
  assert.ok(!/TableName\s*=\s*"/.test(tables), "TableName must not be a hand-written string union");
});

test("StatusTableName only admits tables that have a status column", () => {
  assert.match(tables, /"status" extends keyof/);
});

test("query helpers take a table name type rather than a bare string", () => {
  // A `string` falls through to supabase-js's `(relation: never)` overload,
  // which silently disables column checking for the rest of the chain.
  for (const file of ["lib/public-data/queries.ts", "lib/homepage/data.ts", "lib/admin/overview.ts"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!/table:\s*string/.test(source), `${file} must not type a table parameter as string`);
  }
});

test("the CMS write allowlist is typed against the schema", () => {
  const resources = fs.readFileSync("lib/admin/resources.ts", "utf8");
  assert.match(resources, /table:\s*TableName/);
});

test("the dynamic-table escape hatch stays narrow", () => {
  const dynamic = fs.readFileSync("lib/supabase/dynamic.ts", "utf8");
  // It may relax the column types, but never the table name: that is the check
  // keeping a runtime-chosen table inside chatten_cafe.
  assert.match(dynamic, /table:\s*TableName/);
  const callers = ["lib/admin/actions.ts", "lib/admin/menu-actions.ts", "app/admin/(dashboard)/[resource]/page.tsx"];
  for (const file of callers) {
    assert.match(fs.readFileSync(file, "utf8"), /dynamicTable\(/, `${file} should route its runtime-chosen table through the helper`);
  }
});

test("a drift check is wired into package scripts", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.ok(pkg.scripts["types:generate"], "types:generate must exist");
  assert.ok(pkg.scripts["types:check"], "types:check must exist");
  assert.match(pkg.scripts["types:check"], /--check/);
});
