import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// A78: upload-selection.ts imports the shared limits module. A relative
// specifier cannot resolve from a data: URL, so it is inlined as one.
const compile = (name) => ts.transpileModule(
  fs.readFileSync(new URL(`../lib/media/${name}.ts`, import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText;

const limitsUrl = "data:text/javascript," + encodeURIComponent(compile("upload-limits"));
const javascript = compile("upload-selection").replace(/from\s*"\.\/upload-limits"/g, `from "${limitsUrl}"`);
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
  assert.match(state.message, /maksimal 20 gambar/i);
});

// Transport API accepts exactly one Blob and puts it under the singular `file`
// key. This guards against silently returning to a getAll("files") batch body.
test("FormData carries one file per request under singular file key", () => {
  const first = new Blob(["a"], { type: "image/jpeg" });
  const formData = selection.buildMediaUploadFormData(first);
  assert.equal(formData.getAll("file").length, 1);
  assert.equal(formData.get("file")?.size, first.size);
  assert.equal(formData.get("file")?.type, first.type);
  assert.equal(formData.getAll("files").length, 0);
});

test("partial batch summary stays aggregate", () => {
  const message = selection.summarizeMediaUploadBatch({ results: [{ ok: true }, { ok: true }, { ok: true }, { ok: false }] });
  assert.equal(message, "3 gambar berhasil diunggah. 1 berkas gagal diunggah.");
});

test("media upload component wires native multiple input, drag drop, queue state, and one-file action", () => {
  const component = fs.readFileSync(new URL("../components/admin/media-upload-dropzone.tsx", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../app/admin/(dashboard)/media/page.tsx", import.meta.url), "utf8");
  assert.match(component, /name="files"/);
  assert.match(component, /multiple/);
  assert.match(component, /onDragEnter=/);
  assert.match(component, /onDragOver=/);
  assert.match(component, /onDrop=/);
  assert.match(component, /queueItems/);
  assert.match(component, /uploadMedia/);
  assert.match(component, /uploadMedia\(buildMediaUploadFormData\(file\)\)/);
  assert.ok(!/uploadMediaBatch/.test(component));
  assert.match(component, /applyUploadOutcome/);
  assert.match(page, /MediaUploadDropzone/);
});

// A91 (lanjutan). This test used to assert `!uploading && !hasResults`, which is
// exactly the defect: results are per-file, so the first completion of a 20-file
// batch locked the queue permanently and the operator could only recover by
// reloading the page and re-picking every file. The lock now lasts precisely as
// long as requests are in flight — a request whose File is already being read
// must not have its row removed under it — and no longer.
test("media upload component locks queue edits only while requests are in flight", () => {
  const component = fs.readFileSync(new URL("../components/admin/media-upload-dropzone.tsx", import.meta.url), "utf8");
  assert.match(component, /const canModifyQueue = !uploading/);
  assert.ok(!/canModifyQueue = !uploading &&/.test(component), "the queue lock outlives the requests again");
  assert.match(component, /if \(!canModifyQueue \|\| !files\.length\) return/);
  assert.match(component, /if \(!canModifyQueue\) return;/);
  assert.match(component, /disabled=\{!canModifyQueue\}/);
  assert.match(component, /disabled=\{!selection\.canSubmit \|\| uploading\}/);
});

// A78. Before this, the browser's limit and the server's limit were two
// unrelated constants that both happened to be 20. Nothing was visibly wrong,
// and nothing would have been wrong until someone changed one of them — at
// which point the dropzone would accept a selection the server then rejected,
// after the operator had already chosen the files.
//
// Asserting "both are 20" would re-create the same coupling by hand. These
// assert they are the SAME VALUE, whatever it becomes.
test("the selection limit is the limit the server enforces", async () => {
  const limits = await import("data:text/javascript," + encodeURIComponent(compile("upload-limits")));
  assert.equal(selection.MAX_MEDIA_SELECTION_FILES, limits.MAX_MEDIA_UPLOAD_FILES);
});

test("the size limit shown to operators is derived from the enforced value", async () => {
  const limits = await import("data:text/javascript," + encodeURIComponent(compile("upload-limits")));
  const megabytes = limits.MAX_MEDIA_UPLOAD_BYTES / (1024 * 1024);
  assert.equal(limits.formatMediaSizeLimit(), `${megabytes} MB`);
  assert.equal(selection.formatMediaSizeLimit(), limits.formatMediaSizeLimit());
});
