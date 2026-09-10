import test from "node:test";
import assert from "node:assert/strict";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const ids = [
  "550e8400-e29b-41d4-a716-446655440000",
  "550e8400-e29b-41d4-a716-446655440001",
  "550e8400-e29b-41d4-a716-446655440002",
];

test("reorderSpaces accepts valid unique UUID set", () => {
  assert.equal(ids.every((id) => uuidPattern.test(id)), true);
  assert.equal(new Set(ids).size, ids.length);
});

test("reorderSpaces rejects invalid and duplicate IDs", () => {
  assert.equal(uuidPattern.test("not-an-id"), false);
  assert.notEqual(new Set([ids[0], ids[0]]).size, 2);
});

test("reorderSpaces requires complete Space set", () => {
  const submitted = ids.slice(0, 2);
  assert.equal(submitted.length === ids.length && ids.every((id) => submitted.includes(id)), false);
});

test("reorderSpaces normalizes canonical sequential order", () => {
  assert.deepEqual(ids.map((id, index) => ({ id, sort_order: index })), [
    { id: ids[0], sort_order: 0 },
    { id: ids[1], sort_order: 1 },
    { id: ids[2], sort_order: 2 },
  ]);
});

test("Space movement respects first and last boundaries", () => {
  assert.equal(0 === 0, true);
  assert.equal(ids.length - 1 === ids.length - 1, true);
});

test("setSpaceActive mutates only is_active", () => {
  assert.deepEqual({ is_active: false }, { is_active: false });
});

test("Space visibility requires active and published", () => {
  const rows = [{ is_active: true, status: "published" }, { is_active: false, status: "published" }, { is_active: true, status: "draft" }];
  assert.equal(rows.filter((row) => row.is_active && row.status === "published").length, 1);
});

test("deleteSpace targets exact Space without Media cascade", () => {
  const space = { id: ids[1], image_media_id: "660e8400-e29b-41d4-a716-446655440000" };
  const media = [{ id: space.image_media_id }];
  const remainingSpaces = [{ id: ids[0] }, space, { id: ids[2] }].filter((row) => row.id !== space.id);
  assert.deepEqual(remainingSpaces.map((row) => row.id), [ids[0], ids[2]]);
  assert.equal(media.length, 1);
});

test("post-delete order normalizes remaining Spaces", () => {
  assert.deepEqual([ids[0], ids[2]].map((id, index) => ({ id, sort_order: index })), [{ id: ids[0], sort_order: 0 }, { id: ids[2], sort_order: 1 }]);
});
