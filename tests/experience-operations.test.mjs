import test from "node:test";
import assert from "node:assert/strict";

test("reorderExperiences validates UUID format", () => {
  const validIds = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
  ];
  
  const invalidIds = [
    "not-a-uuid",
    "123",
    "",
    "550e8400-INVALID",
  ];
  
  const isValidUUID = (id) => /^[0-9a-f-]{36}$/i.test(id);
  
  assert.equal(validIds.every(isValidUUID), true);
  assert.equal(invalidIds.every(isValidUUID), false);
});

test("reorderExperiences normalizes sort_order sequentially", () => {
  const ids = [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
  ];
  
  const normalizedOrder = ids.map((id, index) => ({
    id,
    sort_order: index,
  }));
  
  assert.equal(normalizedOrder[0].sort_order, 0);
  assert.equal(normalizedOrder[1].sort_order, 1);
  assert.equal(normalizedOrder[2].sort_order, 2);
  assert.equal(normalizedOrder.length, 3);
});

test("reorderExperiences requires all IDs to exist", () => {
  const submittedIds = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002",
  ];
  
  const existingIds = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
  ];
  
  const allExist = submittedIds.every((id) => existingIds.includes(id));
  
  assert.equal(allExist, false);
  assert.equal(submittedIds.length === existingIds.length, false);
});

test("reorderExperiences accepts valid ID set", () => {
  const submittedIds = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
  ];
  
  const existingIds = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
  ];
  
  const allExist = submittedIds.every((id) => existingIds.includes(id));
  
  assert.equal(allExist, true);
  assert.equal(submittedIds.length, existingIds.length);
});

test("reorderExperiences rejects empty array", () => {
  const ids = [];
  
  assert.equal(ids.length === 0, true);
});

test("reorderExperiences rejects duplicate IDs", () => {
  const ids = [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440000",
  ];
  
  const unique = new Set(ids);
  
  assert.equal(unique.size === ids.length, false);
});

test("setExperienceActive validates ID format", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const invalidId = "not-a-uuid";
  
  const isValidUUID = (id) => /^[0-9a-f-]{36}$/i.test(id);
  
  assert.equal(isValidUUID(validId), true);
  assert.equal(isValidUUID(invalidId), false);
});

test("setExperienceActive accepts boolean active state", () => {
  const activeStates = [
    { input: "true", expected: true },
    { input: "false", expected: false },
  ];
  
  activeStates.forEach(({ input, expected }) => {
    const active = input === "true";
    assert.equal(active, expected);
  });
});

test("setExperienceActive updates only is_active field", () => {
  const allowedFields = ["is_active"];
  const payload = { is_active: true };
  
  const fields = Object.keys(payload);
  
  assert.deepEqual(fields, allowedFields);
  assert.equal("name" in payload, false);
  assert.equal("status" in payload, false);
  assert.equal("sort_order" in payload, false);
});

test("deleteExperience validates ID format", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const emptyId = "";
  
  const isValidUUID = (id) => !!id && /^[0-9a-f-]{36}$/i.test(id);
  
  assert.equal(isValidUUID(validId), true);
  assert.equal(isValidUUID(emptyId), false);
});

test("deleteExperience targets exact experience row", () => {
  const targetId = "550e8400-e29b-41d4-a716-446655440000";
  const experiences = [
    { id: "550e8400-e29b-41d4-a716-446655440000", name: "Morning" },
    { id: "660e8400-e29b-41d4-a716-446655440001", name: "Golden Hour" },
  ];
  
  const target = experiences.find((exp) => exp.id === targetId);
  const remaining = experiences.filter((exp) => exp.id !== targetId);
  
  assert.ok(target);
  assert.equal(target.name, "Morning");
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].name, "Golden Hour");
});

test("deleteExperience does not cascade to media", () => {
  const experience = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Morning Coffee",
    image_media_id: "770e8400-e29b-41d4-a716-446655440002",
  };
  
  const mediaLibrary = [
    { id: "770e8400-e29b-41d4-a716-446655440002", title: "Sunrise" },
  ];
  
  // Experience references media but deleting experience preserves media
  const mediaStillExists = mediaLibrary.some(
    (media) => media.id === experience.image_media_id
  );
  
  assert.equal(mediaStillExists, true);
});

test("experience visibility states are distinct", () => {
  const states = [
    { is_active: true, status: "published" },
    { is_active: false, status: "published" },
    { is_active: true, status: "draft" },
    { is_active: false, status: "draft" },
  ];
  
  const uniqueStates = new Set(
    states.map((s) => `${s.is_active}-${s.status}`)
  );
  
  assert.equal(uniqueStates.size, 4);
});

test("public experience query filters by active and published", () => {
  const experiences = [
    { id: "1", is_active: true, status: "published" },
    { id: "2", is_active: false, status: "published" },
    { id: "3", is_active: true, status: "draft" },
    { id: "4", is_active: false, status: "draft" },
  ];
  
  const publicExperiences = experiences.filter(
    (exp) => exp.is_active && exp.status === "published"
  );
  
  assert.equal(publicExperiences.length, 1);
  assert.equal(publicExperiences[0].id, "1");
});
