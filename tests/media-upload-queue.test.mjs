import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/media/upload-queue.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const queue = await import("data:text/javascript," + encodeURIComponent(javascript));

const mockFile = (name, size = 1024) => ({ name, size });

test("createQueueItem creates a queue item with ready status", () => {
  const file = mockFile("test.jpg");
  const item = queue.createQueueItem("id-1", file);
  assert.equal(item.id, "id-1");
  assert.equal(item.file.name, "test.jpg");
  assert.equal(item.status, "ready");
});

test("setQueueItemsUploading sets all items to uploading status", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "ready" },
    { id: "2", file: mockFile("b.jpg"), status: "ready" },
  ];
  const result = queue.setQueueItemsUploading(items);
  assert.equal(result[0].status, "uploading");
  assert.equal(result[1].status, "uploading");
});

test("applyUploadResults marks successful uploads as complete", () => {
  const items = [{ id: "1", file: mockFile("a.jpg"), status: "uploading" }];
  const results = [{ ok: true, filename: "a.jpg", mediaId: "uuid-1" }];
  const updated = queue.applyUploadResults(items, results);
  assert.equal(updated[0].status, "complete");
  assert.equal(updated[0].mediaId, "uuid-1");
});

test("applyUploadResults marks failed uploads with error details", () => {
  const items = [{ id: "1", file: mockFile("large.jpg"), status: "uploading" }];
  const results = [{ ok: false, filename: "large.jpg", code: "FILE_TOO_LARGE", message: "Each image must be 10 MB or smaller." }];
  const updated = queue.applyUploadResults(items, results);
  assert.equal(updated[0].status, "failed");
  assert.equal(updated[0].code, "FILE_TOO_LARGE");
  assert.equal(updated[0].message, "Each image must be 10 MB or smaller.");
});

test("applyUploadResults handles partial success correctly", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "uploading" },
    { id: "2", file: mockFile("b.jpg"), status: "uploading" },
    { id: "3", file: mockFile("c.jpg"), status: "uploading" },
  ];
  const results = [
    { ok: true, filename: "a.jpg", mediaId: "uuid-1" },
    { ok: false, filename: "b.jpg", code: "DUPLICATE_MEDIA", message: "This image already exists in the Media Library." },
    { ok: true, filename: "c.jpg", mediaId: "uuid-3" },
  ];
  const updated = queue.applyUploadResults(items, results);
  assert.equal(updated[0].status, "complete");
  assert.equal(updated[1].status, "failed");
  assert.equal(updated[2].status, "complete");
});

test("formatFileSize formats bytes", () => {
  assert.equal(queue.formatFileSize(512), "512 B");
});

test("formatFileSize formats kilobytes", () => {
  assert.equal(queue.formatFileSize(2048), "2.0 KB");
});

test("formatFileSize formats megabytes", () => {
  assert.equal(queue.formatFileSize(2 * 1024 * 1024), "2.0 MB");
  assert.equal(queue.formatFileSize(10.5 * 1024 * 1024), "10.5 MB");
});

test("summarizeQueueResults summarizes all successful uploads", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "complete", mediaId: "uuid-2" },
  ];
  assert.equal(queue.summarizeQueueResults(items), "2 images uploaded.");
});

test("summarizeQueueResults summarizes single successful upload", () => {
  const items = [{ id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" }];
  assert.equal(queue.summarizeQueueResults(items), "1 image uploaded.");
});

test("summarizeQueueResults summarizes partial success", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Error" },
    { id: "3", file: mockFile("c.jpg"), status: "complete", mediaId: "uuid-3" },
  ];
  assert.equal(queue.summarizeQueueResults(items), "2 images uploaded. 1 file failed.");
});

test("summarizeQueueResults handles multiple failures", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Error 1" },
    { id: "3", file: mockFile("c.jpg"), status: "failed", message: "Error 2" },
  ];
  assert.equal(queue.summarizeQueueResults(items), "1 image uploaded. 2 files failed.");
});
