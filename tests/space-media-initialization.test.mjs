import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const listPage = fs.readFileSync("app/admin/(dashboard)/spaces/page.tsx", "utf8");
const editPage = fs.readFileSync("app/admin/(dashboard)/spaces/items/[id]/page.tsx", "utf8");
const editForm = fs.readFileSync("components/admin/space-edit-form.tsx", "utf8");

test("the space media picker offers every uploaded image", () => {
  for (const [name, source] of [["list", listPage], ["edit", editPage]]) {
    assert.match(source, /from\("media"\)/, `the ${name} page no longer loads media`);
    assert.ok(!/rights_status/.test(source), `the ${name} page filters or selects rights_status again`);
  }
});

test("the edit form starts on the space's current image", () => {
  assert.match(editForm, /MediaPicker/);
  assert.match(editForm, /image_media_id/);
});
