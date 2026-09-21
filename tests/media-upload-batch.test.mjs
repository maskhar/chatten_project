import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync(new URL("../lib/media/upload-core.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES, processMediaUploadBatch } = await import("data:text/javascript," + encodeURIComponent(js));

function bytes(values, length = values.length) {
  const output = new Uint8Array(length);
  output.set(values);
  return output;
}

function png() { const output = bytes([137, 80, 78, 71, 13, 10, 26, 10], 24); new DataView(output.buffer).setUint32(16, 120); new DataView(output.buffer).setUint32(20, 80); return output; }
function jpeg() { return bytes([255, 216, 255, 0]); }
function webp() { return bytes([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]); }
function avif() { return bytes([0, 0, 0, 0, 102, 116, 121, 112, 97, 118, 105, 102]); }
function file(name, content, size = content.length) { return { name, type: "application/octet-stream", size, arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) }; }

function adapter({ existing = [], failUploadAt = [], failInsertAt = [] } = {}) {
  const uploads = [];
  const records = [];
  const insertAttempts = [];
  const removals = [];
  return {
    uploads, records, insertAttempts, removals,
    async findBySha256(sha256) { const record = existing.concat(records).find((item) => item.sha256 === sha256); return record ? { id: record.id } : null; },
    async upload(path, content, contentType) { uploads.push({ path, content, contentType }); return failUploadAt.includes(uploads.length) ? { error: new Error("storage") } : {}; },
    async insert(record) { insertAttempts.push(record); if (failInsertAt.includes(insertAttempts.length)) return { error: new Error("database") }; const id = "media-" + records.length; records.push({ ...record, id }); return { id }; },
    async remove(path) { removals.push(path); },
  };
}

test("batch accepts JPEG, PNG, WebP, and AVIF with per-file results", async () => {
  const target = adapter();
  const result = await processMediaUploadBatch([file("one.jpg", jpeg()), file("two.png", png()), file("three.webp", webp()), file("four.avif", avif())], target);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.results.map((item) => item.ok), [true, true, true, true]);
  assert.deepEqual(target.records.map((record) => record.mime_type), ["image/jpeg", "image/png", "image/webp", "image/avif"]);
  assert.ok(target.records.every((record) => record.source_type === "operator-upload"));
  assert.equal(target.records[0].original_filename, "one.jpg");
  assert.equal(target.records[0].title, "one.jpg");
  assert.equal(target.records[0].file_size, jpeg().length);
  assert.equal(target.records[0].sha256.length, 64);
  assert.deepEqual(target.records[0].tags, []);
});

test("invalid SVG and oversized file do not stop valid siblings", async () => {
  const target = adapter();
  const result = await processMediaUploadBatch([file("valid.jpg", jpeg()), file("logo.svg", bytes([60, 115, 118, 103, 62])), file("large.png", png(), MAX_MEDIA_UPLOAD_BYTES + 1), file("later.png", png())], target);
  assert.deepEqual(result.results.map((item) => item.ok), [true, false, false, true]);
  assert.equal(result.results[1].code, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(result.results[2].code, "FILE_TOO_LARGE");
  assert.equal(target.records.length, 2);
});

test("malformed image processing failure does not cancel later files", async () => {
  const target = adapter();
  const result = await processMediaUploadBatch([file("truncated.png", bytes([137, 80, 78, 71])), file("later.jpg", jpeg())], target);
  assert.equal(result.results[0].ok, false);
  assert.equal(result.results[0].code, "MEDIA_RECORD_FAILED");
  assert.equal(result.results[1].ok, true);
});

test("empty and oversized batches return controlled results without uploads", async () => {
  const target = adapter();
  const empty = await processMediaUploadBatch([], target);
  assert.equal(empty.error?.code, "EMPTY_BATCH");
  const tooMany = await processMediaUploadBatch(Array.from({ length: MAX_MEDIA_UPLOAD_FILES + 1 }, (_, index) => file("item-" + index + ".jpg", jpeg())), target);
  assert.equal(tooMany.error?.code, "BATCH_LIMIT_EXCEEDED");
  assert.ok(tooMany.results.every((item) => !item.ok && item.code === "BATCH_LIMIT_EXCEEDED"));
  assert.equal(target.uploads.length, 0);
});

test("existing and same-batch duplicates avoid second Storage writes", async () => {
  const target = adapter();
  const content = jpeg();
  const result = await processMediaUploadBatch([file("first.jpg", content), file("same.jpg", content)], target);
  assert.equal(result.results[0].ok, true);
  assert.equal(result.results[1].ok, false);
  assert.equal(result.results[1].code, "DUPLICATE_MEDIA");
  assert.equal(target.uploads.length, 1);
  const existingTarget = adapter({ existing: [{ id: "existing-media", sha256: target.records[0].sha256 }] });
  const existingResult = await processMediaUploadBatch([file("existing.jpg", content)], existingTarget);
  assert.equal(existingResult.results[0].ok, false);
  assert.equal(existingResult.results[0].code, "DUPLICATE_MEDIA");
  assert.equal(existingTarget.uploads.length, 0);
});

test("Storage failure and DB failure return per-file results and exact cleanup", async () => {
  const target = adapter({ failUploadAt: [1], failInsertAt: [1] });
  const result = await processMediaUploadBatch([file("storage.jpg", jpeg()), file("database.png", png()), file("later.webp", webp())], target);
  assert.deepEqual(result.results.map((item) => item.ok), [false, false, true]);
  assert.equal(result.results[0].code, "STORAGE_UPLOAD_FAILED");
  assert.equal(result.results[1].code, "MEDIA_RECORD_FAILED");
  assert.equal(target.records.length, 1);
  assert.equal(target.insertAttempts.length, 2);
  assert.equal(target.removals.length, 1);
  assert.equal(target.removals[0], target.uploads[1].path);
});

// 20260921000500 removed rights_status: an upload is publishable by the act of
// uploading it. What still matters here is that the server action goes through
// the shared batch processor rather than building its own insert, and that it
// takes no rights field back from the form.
test("upload server path goes through the shared batch processor", () => {
  const action = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const uploadSource = action.slice(0, action.indexOf("export async function deleteMediaWithFeedback"));
  assert.match(uploadSource, /uploadMediaBatch/);
  assert.match(uploadSource, /processMediaUploadBatch/);
  assert.ok(!/rights_status/.test(src), "upload-core writes rights_status again");
  assert.ok(!/rights_status/.test(uploadSource), "the upload action reads rights_status again");
});
