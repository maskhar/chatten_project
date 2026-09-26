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

test("startQueueUpload marks every waiting item as uploading", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "ready" },
    { id: "2", file: mockFile("b.jpg"), status: "ready" },
  ];
  const result = queue.startQueueUpload(items);
  assert.equal(result[0].status, "uploading");
  assert.equal(result[1].status, "uploading");
});

// A91: the whole queue used to be flipped to `uploading` on submit. After a
// partial batch that meant an already-uploaded file was sent a second time, and
// its bytes are in the Media Library — so the duplicate guard refused it and the
// operator read a brand-new error about a file that had actually succeeded.
test("startQueueUpload never re-sends an item that already succeeded", () => {
  const items = [
    { id: "1", file: mockFile("done.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("broken.jpg"), status: "failed", message: "Gagal" },
    { id: "3", file: mockFile("new.jpg"), status: "ready" },
  ];
  const result = queue.startQueueUpload(items);
  assert.deepEqual(result.map((item) => item.status), ["complete", "failed", "uploading"]);
  assert.equal(result[0].mediaId, "uuid-1");
  assert.deepEqual(queue.readyQueueItems(items).map((item) => item.id), ["3"]);
});

// The summary gate. Each file resolves in its own request, so on a 20-file batch
// the first completion used to make "has results" true and the summary appeared
// reporting a count that was correct for exactly one tick.
test("a queue is settled only once every item is terminal", () => {
  const mixed = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "uploading" },
  ];
  assert.equal(queue.isQueueSettled(mixed), false);
  assert.equal(queue.isQueueUploading(mixed), true);

  const withReady = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "ready" },
  ];
  assert.equal(queue.isQueueSettled(withReady), false, "a waiting item is not a result");
  assert.equal(queue.isQueueUploading(withReady), false);

  const done = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Gagal" },
  ];
  assert.equal(queue.isQueueSettled(done), true);
  assert.equal(queue.isQueueUploading(done), false);

  // An empty queue has no results to report, so it is not "settled".
  assert.equal(queue.isQueueSettled([]), false);
});

test("retryFailedQueueItems keeps only failures and resets them to ready", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", code: "DUPLICATE_MEDIA", message: "Gambar ini sudah ada." },
    { id: "3", file: mockFile("c.jpg"), status: "failed", code: "STORAGE_UPLOAD_FAILED", message: "Storage gagal." },
  ];
  const retried = queue.retryFailedQueueItems(items);
  assert.deepEqual(retried.map((item) => item.id), ["2", "3"]);
  assert.deepEqual(retried.map((item) => item.status), ["ready", "ready"]);
  // The previous reason is cleared: keeping it would label a fresh attempt with
  // the outcome of the attempt before it.
  assert.equal(retried[0].message, undefined);
  assert.equal(retried[0].code, undefined);
  assert.deepEqual(retried.map((item) => item.file.name), ["b.jpg", "c.jpg"]);
});

test("retrying a fully successful queue leaves nothing to send", () => {
  const items = [{ id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" }];
  assert.deepEqual(queue.retryFailedQueueItems(items), []);
});

test("queueCounts reports every status", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "ready" },
    { id: "2", file: mockFile("b.jpg"), status: "uploading" },
    { id: "3", file: mockFile("c.jpg"), status: "complete", mediaId: "uuid-3" },
    { id: "4", file: mockFile("d.jpg"), status: "failed", message: "Gagal" },
    { id: "5", file: mockFile("e.jpg"), status: "failed", message: "Gagal" },
  ];
  assert.deepEqual(queue.queueCounts(items), { total: 5, ready: 1, uploading: 1, complete: 1, failed: 2 });
  assert.equal(queue.isTerminalQueueItem(items[2]), true);
  assert.equal(queue.isTerminalQueueItem(items[3]), true);
  assert.equal(queue.isTerminalQueueItem(items[0]), false);
  assert.equal(queue.isTerminalQueueItem(items[1]), false);
});

// One announcement when the batch starts, one when it finishes. Announcing each
// completion would re-read the region up to twenty times consecutively.
test("the live region carries one sentence per queue phase", () => {
  assert.equal(queue.queueStatusMessage([]), "");
  assert.equal(
    queue.queueStatusMessage([{ id: "1", file: mockFile("a.jpg"), status: "ready" }]),
    "",
    "a selection that has not been submitted is not an announcement",
  );
  assert.equal(
    queue.queueStatusMessage([
      { id: "1", file: mockFile("a.jpg"), status: "uploading" },
      { id: "2", file: mockFile("b.jpg"), status: "complete", mediaId: "uuid-2" },
    ]),
    "Mengunggah 2 berkas…",
  );
  assert.match(
    queue.queueStatusMessage([
      { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
      { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Gagal" },
    ]),
    /^1 gambar berhasil diunggah\. 1 berkas gagal\./,
  );
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

test("summarizeQueueResults summarizes partial success and names the recovery", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "complete", mediaId: "uuid-1" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Error" },
    { id: "3", file: mockFile("c.jpg"), status: "complete", mediaId: "uuid-3" },
  ];
  assert.equal(
    queue.summarizeQueueResults(items),
    "2 gambar berhasil diunggah. 1 berkas gagal. Pilih Ulangi berkas gagal untuk mencoba lagi tanpa mengunggah ulang yang berhasil.",
  );
});

// "0 gambar berhasil diunggah" reads as a count in a sentence that is otherwise
// about success; a batch where nothing worked deserves its own words.
test("a batch where nothing succeeded says so plainly", () => {
  const items = [
    { id: "1", file: mockFile("a.jpg"), status: "failed", message: "Error" },
    { id: "2", file: mockFile("b.jpg"), status: "failed", message: "Error" },
  ];
  assert.match(queue.summarizeQueueResults(items), /^Tidak ada gambar yang berhasil diunggah\. 2 berkas gagal\./);
});

// The behaviour above is only reachable if the component actually asks these
// questions. The dropzone is a client component with a File-backed queue, so its
// wiring is pinned as a source contract rather than rendered here.
test("the dropzone gates the summary, the retry, and the lock on the shared predicates", () => {
  const raw = fs.readFileSync(new URL("../components/admin/media-upload-dropzone.tsx", import.meta.url), "utf8");
  // Comments are stripped before the absence checks: the notes explaining *why*
  // `hasResults` and the raw colours were wrong quote both, and that is exactly
  // the documentation worth keeping.
  const component = raw.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

  // The summary is rendered from `settled`, never from "some result exists".
  assert.match(component, /const settled = isQueueSettled\(queueItems\)/);
  assert.match(component, /\{settled \?.*summarizeQueueResults\(queueItems\)/s);
  assert.ok(!/hasResults/.test(component), "the dropzone still branches on a partial-results flag");

  // The queue unlocks once nothing is in flight, so a partial batch stays fixable.
  assert.match(component, /const canModifyQueue = !uploading/);
  assert.match(component, /onClick=\{retryFailed\}/);
  assert.match(component, /retryFailedQueueItems\(current\)/);

  // Only waiting rows are submitted.
  assert.match(component, /readyQueueItems\(queueItems\)/);
  assert.match(component, /startQueueUpload\(current\)/);

  // One controlled live region for the queue, not an aria-live wrapper around
  // the whole list of files.
  assert.match(component, /aria-live="polite"[^>]*>\{statusMessage\}/);
  assert.match(component, /queueStatusMessage\(queueItems\)/);

  // Semantic tokens, so the contrast gate in tests/palette.test.mjs applies.
  assert.ok(!/text-green-800|text-red-800|bg-red-50|border-red-/.test(component), "the dropzone uses raw Tailwind colours again");
  assert.match(component, /text-leaf/);
  assert.match(component, /text-rust/);
});
