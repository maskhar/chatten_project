import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const presentationSrc = fs.readFileSync(new URL("../lib/media/usage-presentation.ts", import.meta.url), "utf8");
const deleteSrc = fs.readFileSync(new URL("../lib/media/delete-state.ts", import.meta.url), "utf8");
const presentationJs = ts.transpileModule(presentationSrc, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const deleteJs = ts.transpileModule(deleteSrc, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace('import { buildMediaUsagePresentation } from "./usage-presentation";\n', "");
const { buildMediaDeleteState, mediaInUseActionState } = await import("data:text/javascript," + encodeURIComponent(presentationJs + deleteJs));

test("unused Media remains deletable with meaningful confirmation and fallback", () => {
  const named = buildMediaDeleteState([], "Panorama.jpg");
  assert.equal(named.canDelete, true);
  assert.equal(named.protectedMessage, null);
  assert.equal(named.confirmationMessage, "Delete “Panorama.jpg”? This permanently removes the image from the Media Library and Storage.");
  assert.match(buildMediaDeleteState([], " ").confirmationMessage, /Delete “this image”/);
});

test("one Event reference blocks deletion with singular explanation", () => {
  const references = [{ mediaId: "media-1", resource: "event", label: "Event", title: "Acoustic Night" }];
  const state = buildMediaDeleteState(references, "Event image");
  const result = mediaInUseActionState(references);
  assert.equal(state.canDelete, false);
  assert.equal(state.usageCount, 1);
  assert.equal(state.protectedMessage, "This image cannot be deleted because it is currently used in 1 place.");
  assert.deepEqual(state.references, references);
  assert.equal(result.code, "MEDIA_IN_USE");
  assert.deepEqual(result.references, references);
});

test("multiple references preserve Hero, Gallery, and Promotion context", () => {
  const references = [
    { mediaId: "media-1", resource: "hero", label: "Hero", title: "Main Panorama" },
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Golden Hour" },
    { mediaId: "media-1", resource: "promotion", label: "Promotion", title: "Weekend Offer" },
  ];
  const state = buildMediaDeleteState(references, "Shared image");
  assert.equal(state.canDelete, false);
  assert.equal(state.usageCount, 3);
  assert.equal(state.protectedMessage, "This image cannot be deleted because it is currently used in 3 places.");
  assert.deepEqual(state.references, references);
});

test("duplicate Gallery and SEO occurrences all block deletion", () => {
  const references = [
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Sunset" },
    { mediaId: "media-1", resource: "gallery", label: "Gallery", title: "Night View" },
    { mediaId: "media-1", resource: "seo", label: "SEO", title: "Homepage" },
  ];
  const state = buildMediaDeleteState(references, "Shared image");
  assert.equal(state.usageCount, 3);
  assert.deepEqual(state.references.map((reference) => reference.label + " — " + reference.title), ["Gallery — Sunset", "Gallery — Night View", "SEO — Homepage"]);
});

test("actual Media delete flow rechecks usage before Storage deletion", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const deleteSource = actionSource.slice(actionSource.indexOf("export async function deleteMediaWithFeedback"));
  assert.ok(deleteSource.indexOf("loadMediaUsageMap()") < deleteSource.indexOf("supabase.storage"));
  assert.ok(deleteSource.indexOf("if (references.length) return mediaInUseActionState(references)") < deleteSource.indexOf("supabase.storage"));
  assert.match(actionSource, /MEDIA_DELETE_FAILED/);
  const pageSource = fs.readFileSync(new URL("../app/admin/(dashboard)/media/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /MediaDeleteControl/);
  assert.match(pageSource, /references=\{usage\.get\(String\(row\.id\)\)\?\?\[\]\}/);
});
