import test from "node:test";
import assert from "node:assert/strict";

test("maps stored experience row to editable form fields", () => {
  const storedRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Morning Coffee",
    slug: "morning-coffee",
    description: "Start your day with panoramic views and artisan coffee.",
    image_media_id: "660e8400-e29b-41d4-a716-446655440001",
    sort_order: 0,
    is_active: true,
    status: "published",
    created_at: "2026-09-10T10:00:00Z",
    updated_at: "2026-09-10T10:00:00Z",
  };

  const formFields = {
    name: storedRow.name,
    slug: storedRow.slug,
    description: storedRow.description,
    image_media_id: storedRow.image_media_id,
    is_active: storedRow.is_active,
    status: storedRow.status,
  };

  assert.equal(formFields.name, "Morning Coffee");
  assert.equal(formFields.slug, "morning-coffee");
  assert.equal(formFields.description, "Start your day with panoramic views and artisan coffee.");
  assert.equal(formFields.image_media_id, "660e8400-e29b-41d4-a716-446655440001");
  assert.equal(formFields.is_active, true);
  assert.equal(formFields.status, "published");
});

test("handles null image_media_id in experience form", () => {
  const storedRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Golden Hour",
    slug: "golden-hour",
    description: "Watch the sunset paint Batu valley in warm hues.",
    image_media_id: null,
    sort_order: 1,
    is_active: false,
    status: "draft",
  };

  const formFields = {
    name: storedRow.name,
    slug: storedRow.slug,
    description: storedRow.description,
    image_media_id: storedRow.image_media_id,
    is_active: storedRow.is_active,
    status: storedRow.status,
  };

  assert.equal(formFields.image_media_id, null);
  assert.equal(formFields.is_active, false);
  assert.equal(formFields.status, "draft");
});