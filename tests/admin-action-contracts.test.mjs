import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A82: dedicated editors are server-only modules, so their database branches
// cannot be imported safely in node:test. Pin the security boundary in source:
// shared parsing, exact affected-row checks, and no raw posted ID reaches .eq().
const modules = [
  ["menu", "lib/admin/menu-actions.ts", 5],
  ["gallery", "lib/admin/gallery-actions.ts", 3],
  ["event", "lib/admin/event-actions.ts", 3],
  ["promotion", "lib/admin/promotion-actions.ts", 3],
  ["space", "lib/admin/space-actions.ts", 3],
  ["experience", "lib/admin/experience-actions.ts", 3],
  ["role", "lib/admin/role-actions.ts", 4],
];

const sources = new Map(modules.map(([name, file, mutations]) => [
  name,
  { file, mutations, source: fs.readFileSync(file, "utf8") },
]));

function source(name) {
  return sources.get(name).source;
}

test("all dedicated actions consume the shared form vocabulary", () => {
  for (const [name, { file, source: text }] of sources) {
    assert.match(text, /from "@\/lib\/admin\/form-schema"/, `${file} bypasses form-schema`);
    assert.match(text, /assertAffectedRows/, `${file} has no exact-row assertion`);
    assert.doesNotMatch(text, /\[0-9a-f-\]\{36\}/i, `${file} restored weak UUID matching`);
    assert.doesNotMatch(text, /function slugify|function slugify(?:Event|Promotion)/, `${file} restored local slug logic`);
    assert.doesNotMatch(text, /\.eq\("(?:id|user_id)",\s*String\(formData\.get/, `${file} sends raw form ID to PostgREST`);
    assert.doesNotMatch(text, /String\(formData\.get\("active"\)\)\s*===\s*"true"/, `${file} treats a missing toggle as false`);
    assert.match(text, /\{ count: "exact" \}|count: "exact" \}/, `${name} omits PostgREST exact count`);
  }
});

test("every update, delete, or permission-sensitive upsert requests exact count", () => {
  for (const [name, { file, mutations, source: text }] of sources) {
    const exactCountMutations = text.match(/\.(?:update|delete|upsert)\([\s\S]*?\{[\s\S]*?count:\s*"exact"[\s\S]*?\}\)/g) ?? [];
    const assertions = text.match(/assertAffectedRows\(/g) ?? [];
    assert.equal(exactCountMutations.length, mutations, `${file} has mutation without count: exact`);
    assert.equal(assertions.length, mutations, `${file} has mutation without exact affected-row check`);
    assert.doesNotMatch(text, /\.delete\(\)(?!\s*\.eq)/, `${name} has unchecked delete`);
  }
});

test("write actions parse IDs, status, and explicit visibility state", () => {
  for (const name of ["menu", "gallery", "event", "promotion", "space", "experience"]) {
    const text = source(name);
    assert.match(text, /parseUuid\(formData\.get\("id"\)/, `${name} delete/toggle ID is not strict UUID`);
    assert.match(text, /parseOptionalUuid\(formData\.get\("id"\)/, `${name} save ID is not optional strict UUID`);
    assert.match(text, /parseStatus\(formData\.get\("status"\), \{ strict: true/, `${name} permits arbitrary status`);
    assert.match(text, /parseBooleanFlag\(formData\.get\("active"\)/, `${name} has no explicit toggle parser`);
  }
  assert.match(source("menu"), /if \(\/-\/\.test\(rawPrice\)\) throw new Error\("Harga tidak boleh bernilai negatif\."\)/);
  assert.match(source("role"), /parseUuid\(formData\.get\("user_id"\)/);
  assert.match(source("role"), /parseRole\(formData\.get\("role"\)/);
});

test("foreign-key and reorder lookups stop on lookup errors", () => {
  for (const name of ["gallery", "event", "promotion", "space", "experience"]) {
    assert.match(source(name), /mediaLookup\.error/, `${name} ignores media lookup error`);
  }
  assert.match(source("menu"), /categoryLookup\.error/);
  assert.match(source("menu"), /lookup\.error/);
  assert.match(source("menu"), /if \(error\) throw new Error\("Urutan menu tidak dapat dibaca/);
  assert.match(source("space"), /if \(error\) throw new Error\("Daftar ruang tidak dapat dibaca/);
  assert.match(source("experience"), /if \(error\) throw new Error\("Daftar pengalaman tidak dapat dibaca/);
  assert.match(source("role"), /if \(error\) throw new Error\("Peran Anda tidak dapat diperiksa/);
});

test("reorder paths require every currently visible row", () => {
  for (const name of ["gallery", "space", "experience"]) {
    const text = source(name);
    assert.match(text, /data\.length !== ids\.length|existingIds\.length !== ids\.length/, `${name} accepts a partial reorder list`);
    assert.match(text, /if \(error\) throw new Error/, `${name} ignores reorder lookup failure`);
  }
  assert.match(source("menu"), /data\.length !== ids\.length/);
});
