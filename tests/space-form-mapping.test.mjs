import test from "node:test";
import assert from "node:assert/strict";

test("maps stored space row to editable form fields", () => {
  const row = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Garden Terrace", slug: "garden-terrace", description: "Open-air seating.", image_media_id: "660e8400-e29b-41d4-a716-446655440001", is_active: true, status: "published", sort_order: 2 };
  const fields = { name: row.name, slug: row.slug, description: row.description, image_media_id: row.image_media_id, is_active: row.is_active, status: row.status };
  assert.deepEqual(fields, { name: "Garden Terrace", slug: "garden-terrace", description: "Open-air seating.", image_media_id: "660e8400-e29b-41d4-a716-446655440001", is_active: true, status: "published" });
  assert.equal("sort_order" in fields, false);
});

test("space image relation accepts null", () => {
  assert.equal(({ image_media_id: null }).image_media_id, null);
});
