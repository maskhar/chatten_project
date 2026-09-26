import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// These tests used to filter an inline array by rights_status and assert the
// result, which exercised Array.prototype.filter rather than anything in the
// repository. They now read the files they are named after: the picker query
// and the edit form are what actually decide which images an operator sees.

const listPage = fs.readFileSync("app/admin/(dashboard)/experiences/page.tsx", "utf8");
const editPage = fs.readFileSync("app/admin/(dashboard)/experiences/items/[id]/page.tsx", "utf8");
const editForm = fs.readFileSync("components/admin/experience-edit-form.tsx", "utf8");

test("the experience media picker offers every uploaded image", () => {
  // 20260921000500 removed the approval gate: an image is usable the moment
  // it is uploaded, so a picker that filtered would hide images the operator
  // had just added with nothing on screen to explain why.
  for (const [name, source] of [["list", listPage], ["edit", editPage]]) {
    assert.match(source, /from\("media"\)/, `the ${name} page no longer loads media`);
    assert.ok(!/rights_status/.test(source), `the ${name} page filters or selects rights_status again`);
  }
});

test("the edit form starts on the experience's current image", () => {
  assert.match(editForm, /MediaPicker/);
  assert.match(editForm, /image_media_id/);
});
