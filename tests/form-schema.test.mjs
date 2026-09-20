import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// A61. Zod was a dependency that only parsed environment variables; every
// server action hand-rolled its own input checks and they disagreed with each
// other. These tests pin the shared vocabulary that replaced them, and the
// three concrete defects it closes.

const source = fs.readFileSync("lib/admin/form-schema.ts", "utf8");
// A data: URL module has no package resolution, so the bare "zod" specifier
// has to be rewritten to the resolved file URL before import.
const zodUrl = import.meta.resolve("zod");
const js = ts
  .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  .outputText.replace(/from "zod"/g, `from "${zodUrl}"`);
const mod = await import(`data:text/javascript,${encodeURIComponent(js)}`);
const { STATUS_VALUES, coerceFieldValue, checkboxValue, dayOfWeekSchema, nonNegativeIntSchema, optionalTextSchema, optionalUuidSchema, parseField, parseStatus, priceSchema, requiredTextSchema, uuidSchema } = mod;

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

test("the status values match the database CHECK constraint", () => {
  const migration = fs.readFileSync("supabase/migrations/20260909000100_initial_chatten_cafe.sql", "utf8");
  assert.match(migration, /check \(status in \('draft','published'\)\)/);
  assert.deepEqual([...STATUS_VALUES], ["draft", "published"]);
});

test("an absent or tampered status falls back to draft, never to published", () => {
  // saveGalleryItem used to default to "published", so a form posted without
  // the field put the item on the public site without passing review.
  assert.equal(parseStatus(null), "draft");
  assert.equal(parseStatus(""), "draft");
  assert.equal(parseStatus("archived"), "draft");
  assert.equal(parseStatus("published"), "published");
});

test("strict mode rejects a status the database would reject", () => {
  assert.throws(() => parseStatus("archived", { strict: true, label: "space status" }), /Invalid space status\./);
  assert.equal(parseStatus("published", { strict: true }), "published");
  // A missing field is still the safe default, not an error.
  assert.equal(parseStatus(null, { strict: true }), "draft");
});

test("the uuid check rejects what the old 36-character guard accepted", () => {
  const dashes = "-".repeat(36);
  assert.ok(/^[0-9a-f-]{36}$/i.test(dashes), "precondition: the old guard really did accept this");
  assert.ok(!uuidSchema.safeParse(dashes).success);
  assert.ok(!uuidSchema.safeParse("a".repeat(36)).success);
  assert.ok(uuidSchema.safeParse(UUID).success);
});

test("an empty id means creating, not invalid", () => {
  assert.equal(optionalUuidSchema.parse(""), null);
  assert.equal(optionalUuidSchema.parse("  "), null);
  assert.equal(optionalUuidSchema.parse(UUID), UUID);
  assert.ok(!optionalUuidSchema.safeParse("nope").success);
});

test("a non-numeric field is rejected rather than becoming NaN", () => {
  // Number("abc") is NaN, which serialises to null; sort_order and
  // day_of_week are NOT NULL, so the old code turned a typo into a Postgres
  // constraint violation with no indication which field caused it.
  assert.ok(!nonNegativeIntSchema.safeParse("abc").success);
  assert.ok(!nonNegativeIntSchema.safeParse("").success);
  assert.ok(!nonNegativeIntSchema.safeParse("   ").success);
  assert.ok(!nonNegativeIntSchema.safeParse("-1").success);
  assert.ok(!nonNegativeIntSchema.safeParse("1.5").success);
  assert.equal(nonNegativeIntSchema.parse("7"), 7);
  assert.equal(nonNegativeIntSchema.parse(" 7 "), 7);
});

test("day_of_week is bounded to the seven days the table stores", () => {
  assert.equal(dayOfWeekSchema.parse("0"), 0);
  assert.equal(dayOfWeekSchema.parse("6"), 6);
  assert.ok(!dayOfWeekSchema.safeParse("7").success);
  assert.ok(!dayOfWeekSchema.safeParse("-1").success);
});

test("price matches numeric(10,2) with its non-negative CHECK", () => {
  assert.equal(priceSchema.parse("25000"), 25000);
  assert.equal(priceSchema.parse("25000.50"), 25000.5);
  assert.ok(!priceSchema.safeParse("-1").success);
  assert.ok(!priceSchema.safeParse("abc").success);
  assert.ok(!priceSchema.safeParse("999999999").success);
});

test("optional text trims and clears, required text refuses whitespace", () => {
  assert.equal(optionalTextSchema.parse("  hi  "), "hi");
  assert.equal(optionalTextSchema.parse("   "), null);
  assert.equal(requiredTextSchema.parse(" hi "), "hi");
  assert.ok(!requiredTextSchema.safeParse("   ").success);
});

test("a checkbox is only true when the browser actually posted it", () => {
  assert.equal(checkboxValue("on"), true);
  assert.equal(checkboxValue(null), false);
  assert.equal(checkboxValue(""), false);
  assert.equal(checkboxValue("off"), false);
});

test("parseField names the field in the message the editor sees", () => {
  assert.throws(() => parseField(nonNegativeIntSchema, "abc", "Sort order"), /Sort order is invalid\./);
});

test("coerceFieldValue drops blanks but rejects garbage", () => {
  assert.equal(coerceFieldValue("sort_order", null), null);
  assert.equal(coerceFieldValue("sort_order", ""), null);
  assert.equal(coerceFieldValue("sort_order", "3"), 3);
  assert.equal(coerceFieldValue("day_of_week", "2"), 2);
  assert.equal(coerceFieldValue("price", "1500"), 1500);
  assert.equal(coerceFieldValue("status", "archived"), "draft");
  assert.equal(coerceFieldValue("title", " Hello "), " Hello ");
  assert.throws(() => coerceFieldValue("sort_order", "abc", "Sort order"), /Sort order is invalid\./);
  assert.throws(() => coerceFieldValue("price", "abc", "Price"), /Price is invalid\./);
});

test("no admin action still writes an unvalidated status into a payload", () => {
  const dir = "lib/admin";
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".ts") || name === "form-schema.ts") continue;
    const text = fs.readFileSync(`${dir}/${name}`, "utf8");
    assert.ok(
      !/status\s*:\s*String\(formData\.get\("status"\)/.test(text),
      `${name} writes String(formData.get("status")) straight into a payload; route it through parseStatus`,
    );
  }
});

test("no admin action still uses the weak 36-character id guard", () => {
  const dir = "lib/admin";
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".ts") || name.startsWith("reorder") || name === "form-schema.ts") continue;
    const text = fs.readFileSync(`${dir}/${name}`, "utf8");
    assert.ok(!/\[0-9a-f-\]\{36\}/.test(text), `${name} still matches ids with /^[0-9a-f-]{36}$/i`);
  }
});

test("the generic CMS action coerces through the shared helper", () => {
  const text = fs.readFileSync("lib/admin/actions.ts", "utf8");
  assert.match(text, /coerceFieldValue/);
  // The old body was `if (field === "sort_order" ...) return Number(input)`.
  assert.ok(!/return Number\(input\)/.test(text), "actions.ts still coerces with a bare Number()");
});
