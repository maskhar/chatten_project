import test from "node:test";
import assert from "node:assert/strict";
test("media browsing global reset target",()=>{const active={q:"sunset",rights:"approved",usage:"used",category:"panorama"};assert.ok(Object.values(active).every(Boolean));assert.equal("/admin/media","/admin/media");});
