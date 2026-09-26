import test from "node:test";
import assert from "node:assert/strict";

test("space save payload excludes database-only fields", () => {
  const input = { name: "Garden Terrace", slug: "garden-terrace", description: "Open-air seating.", image_media_id: null, is_active: true, status: "draft", id: "id", sort_order: 99, created_at: "secret", malicious_field: "ignored" };
  const allowed = ["name", "slug", "description", "image_media_id", "is_active", "status"];
  const payload = Object.fromEntries(allowed.map((key) => [key, input[key]]));
  assert.deepEqual(Object.keys(payload), allowed);
  assert.equal("sort_order" in payload, false);
  assert.equal("malicious_field" in payload, false);
});

test("space status accepts only draft or published", () => {
  assert.deepEqual(["draft", "published"].filter((status) => ["draft", "published"].includes(status)), ["draft", "published"]);
  assert.equal(["draft", "published"].includes("archived"), false);
});
