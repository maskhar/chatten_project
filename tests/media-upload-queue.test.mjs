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

test("applyUploadOutcome settles only the matching queue item", () => {
  const items = [
    { id: "1", file: mockFile("same.jpg"), status: "uploading" },
    { id: "2", file: mockFile("same.jpg"), status: "uploading" },
  ];
  const updated = queue.applyUploadOutcome(items, "2", { ok: true, filename: "same.jpg", mediaId: "uuid-2" });
  assert.equal(updated[0].status, "uploading");
  assert.equal(updated[0].mediaId, undefined);
  assert.equal(updated[1].status, "complete");
  assert.equal(updated[1].mediaId, "uuid-2");
});

test("independent results preserve earlier successes", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "uploading" },
    { id: "2", file: mockFile("b.jpg"), status: "uploading" },
    { id: "3", file: mockFile("c.jpg"), status: "uploading" },
  ];
  const first = queue.applyUploadOutcome(items, "1", { ok: true, filename: "a.jpg", mediaId: "uuid-1" });
  const second = queue.applyUploadOutcome(first, "2", { ok: false, filename: "b.jpg", code: "DUPLICATE_MEDIA", message: "Gambar ini sudah ada." });
  const third = queue.applyUploadOutcome(second, "3", { ok: true, filename: "c.jpg", mediaId: "uuid-3" });
  assert.deepEqual(third.map((item) => item.status), ["complete", "failed", "complete"]);
  assert.equal(third[0].mediaId, "uuid-1");
  assert.equal(third[1].message, "Gambar ini sudah ada.");
  assert.equal(third[2].mediaId, "uuid-3");
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
  assert.equal(queue.summarizeQueueResults(items), "2 gambar berhasil diunggah.");
});

test("summarizeQueueResults summarizes partial success", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Error" },
    { id: "3", file: mockFile("c.jpg"), status: "complete", mediaId: "uuid-3" },
  ];
  assert.equal(queue.summarizeQueueResults(items), "2 gambar berhasil diunggah. 1 berkas gagal.");
});
