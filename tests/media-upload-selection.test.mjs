import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/media/upload-selection.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const selection = await import("data:text/javascript," + encodeURIComponent(javascript));

const file = (name) => ({ name });
const append = (current, files) => selection.appendMediaSelection(current, files, (item, index) => `${current.length + index}-${item.name}`);

test("three selected files retain filenames and additional selection appends", () => {
  const first = append([], [file("a.jpg"), file("b.webp")]);
  const result = append(first, [file("c.png")]);
  assert.deepEqual(result.map((item) => item.file.name), ["a.jpg", "b.webp", "c.png"]);
});

test("individual removal keeps remaining selection order", () => {
  const files = append([], [file("a.jpg"), file("b.webp"), file("c.png")]);
  const result = selection.removeMediaSelectionItem(files, files[1].id);
  assert.deepEqual(result.map((item) => item.file.name), ["a.jpg", "c.png"]);
});

test("clear selection disables submission and zero files cannot submit", () => {
  const cleared = selection.clearMediaSelection();
  assert.deepEqual(cleared, []);
  assert.equal(selection.mediaSelectionState(cleared.length).canSubmit, false);
});

test("21 files remain selected and block submission without truncation", () => {
  const files = append([], Array.from({ length: 21 }, (_, index) => file(`image-${index}.jpg`)));
  const state = selection.mediaSelectionState(files.length);
  assert.equal(files.length, 21);
  assert.equal(state.overLimit, true);
  assert.equal(state.canSubmit, false);
  assert.match(state.message, /no more than 20 images/);
});

test("FormData uses repeated files entries", () => {
  const first = new Blob(["a"], { type: "image/jpeg" });
  const second = new Blob(["b"], { type: "image/png" });
  const formData = selection.buildMediaUploadFormData([first, second]);
  assert.equal(formData.getAll("files").length, 2);
  assert.equal(formData.get("file"), null);
});

test("partial batch summary stays aggregate", () => {
  const message = selection.summarizeMediaUploadBatch({ results: [{ ok: true }, { ok: true }, { ok: true }, { ok: false }] });
  assert.equal(message, "3 images uploaded. 1 file could not be uploaded.");
});

test("media upload component wires native multiple input, drag drop, queue state, and batch action", () => {
  const component = fs.readFileSync(new URL("../components/admin/media-upload-dropzone.tsx", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../app/admin/(dashboard)/media/page.tsx", import.meta.url), "utf8");
  assert.match(component, /name="files"/);
  assert.match(component, /multiple/);
  assert.match(component, /onDragEnter=/);
  assert.match(component, /onDragOver=/);
  assert.match(component, /onDrop=/);
  assert.match(component, /queueItems/);
  assert.match(component, /uploadMediaBatch/);
  assert.match(component, /buildMediaUploadFormData/);
  assert.match(page, /MediaUploadDropzone/);
});
