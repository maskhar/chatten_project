import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// A58. Reordering used to be one UPDATE per row, usually run twice: a staging
// pass writing sort_order = 100000 + index, then the real values. Reordering
// twelve rows was twenty-four round trips in twenty-four transactions, and an
// interruption between the passes left the list parked in the staging range —
// which the public site renders as an arbitrary order.
//
// The write itself is now one call to chatten_cafe.reorder_rows. These tests
// cover the pure validation half and the contract of the call sites.

const source = fs.readFileSync("lib/admin/reorder-core.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { REORDERABLE_TABLES, isReorderableTable, normalizeOffset, validateReorderIds } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
const correctiveMigration = fs.readFileSync(
  "supabase/migrations/20260926000100_homepage_order_deferrable.sql",
  "utf8",
);

const uuid = (n) => `0000000${n}-0000-4000-8000-000000000000`;

test("validateReorderIds accepts a well-formed list", () => {
  const ids = [uuid(1), uuid(2), uuid(3)];
  assert.deepEqual(validateReorderIds(ids), ids);
});

test("the old guard accepted a run of 36 dashes; this one does not", () => {
  const dashes = "-".repeat(36);
  // The guard every action used to carry, reproduced verbatim.
  assert.ok(/^[0-9a-f-]{36}$/i.test(dashes), "precondition: the old guard really did accept this");
  assert.throws(() => validateReorderIds([dashes]), /Invalid order\./);
});

test("a hex run without dash positions is rejected", () => {
  // 32 hex digits and 4 more characters passed the old guard as well.
  assert.throws(() => validateReorderIds(["a".repeat(36)]), /Invalid order\./);
});

test("duplicate ids are rejected", () => {
  // Two positions competing for one row means an entry silently vanishes from
  // the order. No action checked for this before.
  assert.throws(() => validateReorderIds([uuid(1), uuid(1)]), /Invalid order\./);
});

test("the label appears in the message so the editor knows which list failed", () => {
  assert.throws(() => validateReorderIds(["nope"], "Gallery order"), /Invalid Gallery order\./);
});

test("a non-array is rejected rather than coerced", () => {
  assert.throws(() => validateReorderIds("not-an-array"), /Invalid order\./);
  assert.throws(() => validateReorderIds(null), /Invalid order\./);
});

test("normalizeOffset refuses values that would write negative ranks", () => {
  assert.equal(normalizeOffset(5), 5);
  assert.equal(normalizeOffset("5"), 5);
  assert.equal(normalizeOffset(0), 0);
  assert.equal(normalizeOffset(undefined), 0);
  assert.equal(normalizeOffset(null), 0);
  assert.equal(normalizeOffset(-1), 0);
  assert.equal(normalizeOffset(1.5), 0);
  assert.equal(normalizeOffset("abc"), 0);
});

test("isReorderableTable matches the latest migration allowlist exactly", () => {
  const clause = correctiveMigration.slice(
    correctiveMigration.indexOf("target_table not in ("),
    correctiveMigration.indexOf(") then"),
  );
  const inSql = [...clause.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual([...REORDERABLE_TABLES].sort(), inSql, "the TypeScript allowlist must mirror the database's");
  assert.ok(!REORDERABLE_TABLES.includes("events"));
  assert.ok(!REORDERABLE_TABLES.includes("promotions"));
  for (const table of REORDERABLE_TABLES) assert.ok(isReorderableTable(table));
});

test("homepage sort order is deferred but remains unique", () => {
  assert.match(correctiveMigration, /drop index if exists chatten_cafe\.homepage_sections_sort_order_key/);
  assert.match(correctiveMigration, /add constraint homepage_sections_sort_order_key/);
  assert.match(correctiveMigration, /unique \(sort_order\)\s+deferrable initially deferred/);
});

test("homepage action requires the complete current section set", () => {
  const action = fs.readFileSync("lib/admin/homepage-actions.ts", "utf8");
  assert.match(action, /ids\.length !== rows\.length/);
  assert.match(action, /submitted\.size !== ids\.length/);
  assert.match(action, /ids\.some\(\(id\) => !known\.has\(id\)\)/);
  assert.ok(!action.includes("moveHomepageSection"));
});

test("homepage UI has one atomic save path", () => {
  const component = fs.readFileSync("components/admin/homepage-sortable.tsx", "utf8");
  assert.match(component, /onSave=\{reorderHomepageSections\}/);
  assert.ok(!component.includes("moveHomepageSection"));
  assert.ok(!component.includes('name="direction"'));
});

test("sortable rollback uses its last persisted baseline", () => {
  const component = fs.readFileSync("components/admin/sortable-list.tsx", "utf8");
  assert.match(component, /const persisted = useRef\(items\)/);
  assert.match(component, /persisted\.current = submitted/);
  assert.match(component, /setOrder\(persisted\.current\)/);
});

test("the drag context id is stable across server and client render", () => {
  // A82: DndContext's automatic id comes from a module-global counter that
  // starts at a different value on the server than in the browser, so every
  // drag handle rendered aria-describedby="DndDescribedBy-0" on the server and
  // "DndDescribedBy-73" on the client. React reports that as a hydration
  // mismatch and refuses to patch it, leaving the drag-and-drop description
  // pointing at an element that does not exist for a screen reader.
  const component = fs.readFileSync("components/admin/sortable-list.tsx", "utf8");
  assert.match(component, /useId/);
  assert.match(component, /const dndId = useId\(\)/);
  assert.match(component, /<DndContext\s+id=\{dndId\}/);
});

test("opening_hours is not reorderable", () => {
  // It is unique on (day_of_week, sort_order), so a flat renumber across all
  // seven days collides. It carries a sort_order field in the resource
  // registry, so the generic action must narrow before calling applyOrder.
  assert.ok(!isReorderableTable("opening_hours"));
  assert.ok(!isReorderableTable("user_roles"));
  assert.ok(!isReorderableTable("media"));
});

test("the latest reorder function is SECURITY INVOKER and allowlists its table", () => {
  // DEFINER would run as the owner and bypass the very RLS policies that
  // decide who may reorder these tables.
  assert.match(correctiveMigration, /security invoker/);
  assert.ok(!/security definer/.test(correctiveMigration));
  assert.match(correctiveMigration, /revoke all on function chatten_cafe\.reorder_rows/);
  assert.match(correctiveMigration, /grant execute on function chatten_cafe\.reorder_rows\(text, uuid\[\], integer\) to authenticated/);
  // format(%I) quotes an identifier safely but does not restrict which table.
  assert.match(correctiveMigration, /is not reorderable/);
});

test("no admin action still runs a staging pass or a per-row reorder loop", () => {
  const dir = "lib/admin";
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".ts") || name.startsWith("reorder")) continue;
    const text = fs.readFileSync(`${dir}/${name}`, "utf8");
    assert.ok(!text.includes("100000 +") && !text.includes("100000+"), `${name} still stages sort_order into the 100000 range`);
    assert.ok(
      !/update\(\{\s*sort_order\s*:\s*(offset\s*\+\s*)?index\s*\}\)/.test(text),
      `${name} still writes sort_order one row at a time; route it through applyOrder`,
    );
  }
});

test("applyOrder fails the action when the database updated a different number of rows", () => {
  const text = fs.readFileSync("lib/admin/reorder.ts", "utf8");
  // RLS returning zero rows for a non-empty list means the caller could not
  // write them. Reporting success would show a reordered list that reverts on
  // the next load.
  assert.match(text, /affected !== ids\.length/);
  assert.match(text, /supabase\.rpc\("reorder_rows"/);
});
