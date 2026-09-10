import test from "node:test";
import assert from "node:assert/strict";

test("space media picker initializes current approved image", () => {
  const current = "660e8400-e29b-41d4-a716-446655440001";
  const media = [{ id: current, rights_status: "approved" }, { id: "restricted", rights_status: "restricted" }];
  const approved = media.filter((item) => item.rights_status === "approved");
  assert.equal(approved.find((item) => item.id === current)?.id, current);
  assert.equal(approved.some((item) => item.id === "restricted"), false);
});
