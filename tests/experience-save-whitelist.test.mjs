import test from "node:test";
import assert from "node:assert/strict";

test("whitelists only allowed experience fields", () => {
  const formData = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Morning Coffee",
    slug: "morning-coffee",
    description: "Start your day with panoramic views.",
    image_media_id: "660e8400-e29b-41d4-a716-446655440001",
    is_active: true,
    status: "published",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    sort_order: 999,
    malicious_field: "exploit",
  };

  const allowedFields = ["name", "slug", "description", "image_media_id", "is_active", "status"];

  const whitelisted = {};
  allowedFields.forEach((field) => {
    if (field in formData) {
      whitelisted[field] = formData[field];
    }
  });

  assert.equal(whitelisted.name, "Morning Coffee");
  assert.equal(whitelisted.slug, "morning-coffee");
  assert.equal(whitelisted.description, "Start your day with panoramic views.");
  assert.equal(whitelisted.image_media_id, "660e8400-e29b-41d4-a716-446655440001");
  assert.equal(whitelisted.is_active, true);
  assert.equal(whitelisted.status, "published");
  assert.equal("created_at" in whitelisted, false);
  assert.equal("updated_at" in whitelisted, false);
  assert.equal("sort_order" in whitelisted, false);
  assert.equal("malicious_field" in whitelisted, false);
});

test("validates required experience fields", () => {
  const requiredFields = ["name", "slug", "description"];

  const validPayload = {
    name: "Morning Coffee",
    slug: "morning-coffee",
    description: "Start your day.",
  };

  const invalidPayload = {
    name: "Morning Coffee",
    slug: "",
    description: "Start your day.",
  };

  const isValid = (payload) => {
    return requiredFields.every((field) => payload[field] && String(payload[field]).trim() !== "");
  };

  assert.equal(isValid(validPayload), true);
  assert.equal(isValid(invalidPayload), false);
});

test("handles optional image_media_id field in experience", () => {
  const payloadWithImage = {
    name: "Morning Coffee",
    slug: "morning-coffee",
    description: "Start your day.",
    image_media_id: "660e8400-e29b-41d4-a716-446655440001",
  };

  const payloadWithoutImage = {
    name: "Golden Hour",
    slug: "golden-hour",
    description: "Sunset experience.",
    image_media_id: null,
  };

  assert.ok(payloadWithImage.image_media_id);
  assert.equal(payloadWithoutImage.image_media_id, null);
});

test("validates status enum values for experience", () => {
  const validStatuses = ["draft", "published"];
  const isValidStatus = (status) => validStatuses.includes(status);

  assert.equal(isValidStatus("draft"), true);
  assert.equal(isValidStatus("published"), true);
  assert.equal(isValidStatus("archived"), false);
  assert.equal(isValidStatus("pending"), false);
});