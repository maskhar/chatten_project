import test from "node:test";
import assert from "node:assert/strict";

function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

test("space slug normalizes operator input", () => {
  assert.equal(slugify("Garden Terrace"), "garden-terrace");
  assert.equal(slugify("  Rooftop & Bar  "), "rooftop-bar");
  assert.equal(slugify("Space 2026"), "space-2026");
});
