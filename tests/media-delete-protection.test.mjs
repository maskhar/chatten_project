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
  assert.equal(named.confirmationMessage, "Hapus “Panorama.jpg”? Gambar akan dihapus permanen dari Pustaka Media dan Storage.");
  assert.match(buildMediaDeleteState([], " ").confirmationMessage, /Hapus “gambar ini”/);
});

test("one Event reference blocks deletion with singular explanation", () => {
  const references = [{ mediaId: "media-1", resource: "event", label: "Acara", title: "Acoustic Night" }];
  const state = buildMediaDeleteState(references, "Event image");
  const result = mediaInUseActionState(references);
  assert.equal(state.canDelete, false);
  assert.equal(state.usageCount, 1);
  assert.equal(state.protectedMessage, "Gambar ini tidak dapat dihapus karena sedang dipakai di 1 tempat.");
  assert.deepEqual(state.references, references);
  assert.equal(result.code, "MEDIA_IN_USE");
  assert.deepEqual(result.references, references);
});

test("multiple references preserve Hero, Gallery, and Promotion context", () => {
  const references = [
    { mediaId: "media-1", resource: "hero", label: "Hero", title: "Main Panorama" },
    { mediaId: "media-1", resource: "gallery", label: "Galeri", title: "Golden Hour" },
    { mediaId: "media-1", resource: "promotion", label: "Promosi", title: "Weekend Offer" },
  ];
  const state = buildMediaDeleteState(references, "Shared image");
  assert.equal(state.canDelete, false);
  assert.equal(state.usageCount, 3);
  assert.equal(state.protectedMessage, "Gambar ini tidak dapat dihapus karena sedang dipakai di 3 tempat.");
  assert.deepEqual(state.references, references);
});

test("duplicate Gallery and SEO occurrences all block deletion", () => {
  const references = [
    { mediaId: "media-1", resource: "gallery", label: "Galeri", title: "Sunset" },
    { mediaId: "media-1", resource: "gallery", label: "Galeri", title: "Night View" },
    { mediaId: "media-1", resource: "seo", label: "SEO", title: "Homepage" },
  ];
  const state = buildMediaDeleteState(references, "Shared image");
  assert.equal(state.usageCount, 3);
  assert.deepEqual(state.references.map((reference) => reference.label + " — " + reference.title), ["Galeri — Sunset", "Galeri — Night View", "SEO — Homepage"]);
});

test("actual Media delete flow rechecks usage before Storage deletion", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const deleteSource = actionSource.slice(actionSource.indexOf("export async function deleteMediaWithFeedback"));
  assert.ok(deleteSource.indexOf("loadMediaUsageMap()") < deleteSource.indexOf("supabase.storage"));
  assert.ok(deleteSource.indexOf("if (references.length) return mediaInUseActionState(references)") < deleteSource.indexOf("supabase.storage"));
  assert.match(actionSource, /MEDIA_DELETE_FAILED/);
  const pageSource = fs.readFileSync(new URL("../app/admin/(dashboard)/media/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /MediaDeleteControl/);
  assert.match(pageSource, /references=\{usage\.get\((?:String\(row\.id\)|id)\)\s*\?\?\s*\[\]\}/);
});

// An id that is not a UUID must be refused before it reaches PostgREST, in the
// same vocabulary every other admin action uses.
test("media delete validates the id as a strict UUID", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const deleteSource = actionSource.slice(actionSource.indexOf("export async function deleteMediaWithFeedback"));
  assert.match(deleteSource, /uuidSchema\.safeParse\(id\)/);
  assert.ok(deleteSource.indexOf("uuidSchema.safeParse(id)") < deleteSource.indexOf('from("media")'));
});

// Removing the object first left a Media Library row pointing at bytes that no
// longer existed whenever the metadata delete then failed. Metadata goes first,
// and only a delete that returns exactly one row may remove the object.
test("media delete removes metadata first and verifies the affected row", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const deleteSource = actionSource.slice(actionSource.indexOf("export async function deleteMediaWithFeedback"));
  const metadataDelete = deleteSource.indexOf('.delete().eq("id", id)');
  const storageRemove = deleteSource.indexOf("supabase.storage");
  assert.ok(metadataDelete > 0 && storageRemove > metadataDelete, "Storage removal still precedes the metadata delete");
  assert.match(deleteSource, /\.delete\(\)\.eq\("id", id\)\.select\("id,bucket,storage_path"\)/);
  assert.match(deleteSource, /deletedRows\.length !== 1/);
  assert.ok(deleteSource.indexOf("deletedRows.length !== 1") < storageRemove, "the row count is not verified before Storage removal");
});

// A Storage removal that fails after the row is gone leaves an orphan object.
// That has to be said out loud, with the path, rather than reported as success.
test("a failed Storage removal is reported as an orphan, not as success", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const deleteSource = actionSource.slice(actionSource.indexOf("export async function deleteMediaWithFeedback"));
  assert.match(deleteSource, /if \(storageResult\.error\)/);
  assert.match(deleteSource, /yatim/);
  assert.match(deleteSource, /removedRow\.storage_path/);
  assert.ok(deleteSource.indexOf("if (storageResult.error)") < deleteSource.indexOf('return { status: "success" }'));
});

// Supabase Storage reports a failed removal in its result rather than throwing.
// A remove() that ignores that result tells upload-core compensation succeeded
// when the bytes are still there.
test("the upload adapter inspects Storage removal errors", () => {
  const actionSource = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const adapterSource = actionSource.slice(actionSource.indexOf("function mediaUploadAdapter"), actionSource.indexOf("export async function uploadMedia"));
  assert.match(adapterSource, /const \{ error \} = await supabase\.storage\.from\("chatten-media"\)\.remove\(\[path\]\)/);
  assert.match(adapterSource, /if \(error\) throw error/);
});
