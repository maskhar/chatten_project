import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import ts from "typescript";

// upload-core.ts is loaded as a data: module so it can be exercised without a
// bundler. A relative specifier cannot resolve from a data: URL, so its one
// import — the shared limits module (A78) — is inlined as a data: URL of its
// own before the transpiled source is handed to import().
const read = (name) => fs.readFileSync(new URL(`../lib/media/${name}.ts`, import.meta.url), "utf8");
const compile = (name) => ts.transpileModule(read(name), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;

// Kept as raw source: one test below asserts on the text of upload-core.ts
// itself, not on its behaviour.
const src = read("upload-core");

const limitsUrl = "data:text/javascript," + encodeURIComponent(compile("upload-limits"));
const js = compile("upload-core").replace(/from\s*"\.\/upload-limits"/g, `from "${limitsUrl}"`);
const { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES, processMediaUploadBatch, processMediaUploadFile } = await import("data:text/javascript," + encodeURIComponent(js));

function bytes(values, length = values.length) {
  const output = new Uint8Array(length);
  output.set(values);
  return output;
}

function concat(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const header = new Uint8Array(8);
  new DataView(header.buffer).setUint32(0, data.length);
  header.set([...type].map((character) => character.charCodeAt(0)), 4);
  const crcInput = concat([header.slice(4), data]);
  const trailer = new Uint8Array(4);
  new DataView(trailer.buffer).setUint32(0, crc32(crcInput));
  return concat([header, data, trailer]);
}

// A structurally real PNG: signature, a CRC-correct IHDR carrying the declared
// dimensions, a zlib-framed IDAT, and IEND at the exact end of the buffer.
function png(width = 120, height = 80) {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = new Uint8Array(height * (width * 4 + 1));
  const pixels = new Uint8Array(zlib.deflateSync(raw));
  return concat([
    bytes([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", pixels),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

// SOI, a SOF0 declaring the dimensions, a SOS with entropy-coded payload whose
// 0xFF bytes are byte-stuffed, and EOI.
function jpeg(width = 64, height = 48, payload = [0x12, 0x34]) {
  const frame = new Uint8Array(9);
  frame[0] = 0x08;
  new DataView(frame.buffer).setUint16(1, height);
  new DataView(frame.buffer).setUint16(3, width);
  frame.set([0x01, 0x01, 0x11, 0x00], 5);
  return concat([
    bytes([0xff, 0xd8]),
    bytes([0xff, 0xc0, 0x00, 0x0b]), frame,
    bytes([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]),
    bytes(payload),
    bytes([0xff, 0xd9]),
  ]);
}

// RIFF container whose declared size matches the buffer, holding one lossy VP8
// chunk with the 0x9d012a start code and the 14-bit dimensions.
function webp(width = 32, height = 24) {
  const vp8 = new Uint8Array(14);
  vp8.set([0x30, 0x00, 0x00, 0x9d, 0x01, 0x2a], 0);
  new DataView(vp8.buffer).setUint16(6, width, true);
  new DataView(vp8.buffer).setUint16(8, height, true);
  const chunkHeader = new Uint8Array(8);
  chunkHeader.set([...("VP8 ")].map((character) => character.charCodeAt(0)), 0);
  new DataView(chunkHeader.buffer).setUint32(4, vp8.length, true);
  const body = concat([bytes([...("WEBP")].map((character) => character.charCodeAt(0))), chunkHeader, vp8]);
  const riff = new Uint8Array(8);
  riff.set([...("RIFF")].map((character) => character.charCodeAt(0)), 0);
  new DataView(riff.buffer).setUint32(4, body.length, true);
  return concat([riff, body]);
}

function isoBox(type, payload) {
  const header = new Uint8Array(8);
  new DataView(header.buffer).setUint32(0, payload.length + 8);
  header.set([...type].map((character) => character.charCodeAt(0)), 4);
  return concat([header, payload]);
}

// ftyp declaring the avif brand, a meta box whose ipco carries an ispe with the
// dimensions, and a non-empty mdat.
function avif(width = 16, height = 10) {
  const brands = bytes([...("avifavifmif1")].map((character) => character.charCodeAt(0)));
  const ispePayload = new Uint8Array(12);
  new DataView(ispePayload.buffer).setUint32(4, width);
  new DataView(ispePayload.buffer).setUint32(8, height);
  const ipco = isoBox("ipco", isoBox("ispe", ispePayload));
  const meta = isoBox("meta", concat([new Uint8Array(4), isoBox("iprp", ipco)]));
  return concat([isoBox("ftyp", brands), meta, isoBox("mdat", bytes([1, 2, 3, 4]))]);
}

function file(name, content, size = content.length) {
  return { name, type: "application/octet-stream", size, arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) };
}

function adapter({ existing = [], failUploadAt = [], failInsertAt = [], throwInsertAt = [], failRemove = false, uniquePaths = true } = {}) {
  const uploads = [];
  const records = [];
  const insertAttempts = [];
  const removals = [];
  const storage = new Map();
  return {
    uploads, records, insertAttempts, removals, storage,
    async findBySha256(sha256) { const record = existing.concat(records).find((item) => item.sha256 === sha256); return record ? { id: record.id } : null; },
    async upload(path, content, contentType) {
      uploads.push({ path, content, contentType });
      if (failUploadAt.includes(uploads.length)) return { error: new Error("storage") };
      storage.set(path, content);
      return {};
    },
    async insert(record) {
      insertAttempts.push(record);
      if (throwInsertAt.includes(insertAttempts.length)) throw Object.assign(new Error("duplicate key"), { code: "23505" });
      if (failInsertAt.includes(insertAttempts.length)) return { error: new Error("database") };
      if (uniquePaths && records.some((item) => item.sha256 === record.sha256)) throw Object.assign(new Error("duplicate key"), { code: "23505" });
      const id = "media-" + records.length;
      records.push({ ...record, id });
      return { id };
    },
    async remove(path) { removals.push(path); if (failRemove) throw new Error("storage remove failed"); storage.delete(path); },
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
  assert.equal(target.records[0].sha256.length, 64);
  assert.deepEqual(target.records[0].tags, []);
});

// Dimensions were previously read for PNG only; every other format was stored
// with null width and height even though the column was meant to be usable.
test("real dimensions are recorded for every accepted format", async () => {
  const target = adapter();
  await processMediaUploadBatch([file("one.jpg", jpeg(64, 48)), file("two.png", png(120, 80)), file("three.webp", webp(32, 24)), file("four.avif", avif(16, 10))], target);
  assert.deepEqual(target.records.map((record) => [record.width, record.height]), [[64, 48], [120, 80], [32, 24], [16, 10]]);
});

test("invalid SVG and oversized file do not stop valid siblings", async () => {
  const target = adapter();
  const result = await processMediaUploadBatch([file("valid.jpg", jpeg()), file("logo.svg", bytes([60, 115, 118, 103, 62])), file("large.png", png(), MAX_MEDIA_UPLOAD_BYTES + 1), file("later.png", png())], target);
  assert.deepEqual(result.results.map((item) => item.ok), [true, false, false, true]);
  assert.equal(result.results[1].code, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(result.results[2].code, "FILE_TOO_LARGE");
  assert.equal(target.records.length, 2);
});

// The old detector matched a three-byte prefix and then trusted the rest, so a
// file that merely began like an image reached Storage before anything noticed.
// Validation now runs to completion first, and nothing is written when it fails.
test("structurally invalid images are rejected before any Storage write", async () => {
  const cases = [
    ["truncated.png", png().slice(0, 30)],
    ["tampered.png", (() => { const image = png(); image[20] ^= 0xff; return image; })()],
    ["zero-dimension.png", png(0, 0)],
    ["header-only.jpg", bytes([0xff, 0xd8, 0xff])],
    ["no-scan.jpg", concat([bytes([0xff, 0xd8]), bytes([0xff, 0xd9])])],
    ["short.webp", bytes([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])],
    ["lying-size.webp", (() => { const image = webp(); new DataView(image.buffer).setUint32(4, 9999, true); return image; })()],
    ["stub.avif", bytes([0, 0, 0, 0, 102, 116, 121, 112, 97, 118, 105, 102])],
    ["no-mdat.avif", (() => { const full = avif(); return full.slice(0, full.length - 12); })()],
  ];
  for (const [name, content] of cases) {
    const target = adapter();
    const result = await processMediaUploadFile(file(name, content), target);
    assert.equal(result.ok, false, `${name} was accepted`);
    assert.ok(["INVALID_IMAGE", "UNSUPPORTED_MEDIA_TYPE"].includes(result.code), `${name} produced ${result.code}`);
    assert.equal(target.uploads.length, 0, `${name} reached Storage`);
    assert.equal(target.insertAttempts.length, 0, `${name} reached the database`);
  }
});

test("a declared size that disagrees with the delivered bytes is rejected", async () => {
  const target = adapter();
  const content = png();
  const result = await processMediaUploadFile(file("mismatch.png", content, content.length + 512), target);
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_IMAGE");
  assert.equal(target.uploads.length, 0);
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
  assert.equal(target.storage.has(target.uploads[1].path), false);
});

// A rejected insert can arrive as a thrown error rather than an `error` field —
// a unique-constraint violation on sha256 is the ordinary way to get one. The
// old catch-all swallowed it after the object was already written, so the bytes
// stayed in Storage with no row referencing them.
test("an insert that throws still compensates its own Storage object", async () => {
  const target = adapter({ throwInsertAt: [1] });
  const result = await processMediaUploadFile(file("thrown.png", png()), target);
  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_MEDIA");
  assert.equal(target.uploads.length, 1);
  assert.deepEqual(target.removals, [target.uploads[0].path]);
  assert.equal(target.storage.size, 0);
});

// Compensation that fails is a different outcome to compensation that works: an
// object is left behind, and saying only "could not save" hides it.
test("a failed cleanup is reported rather than silently swallowed", async () => {
  const target = adapter({ failInsertAt: [1], failRemove: true });
  const result = await processMediaUploadFile(file("orphan.png", png()), target);
  assert.equal(result.ok, false);
  assert.equal(result.code, "CLEANUP_FAILED");
  assert.match(result.message, /tidak dapat dibersihkan/);
  assert.equal(target.removals.length, 1);
  assert.equal(target.storage.size, 1);
});

// Two requests uploading identical bytes at once both passed the pre-insert
// duplicate check, then derived the same sha-based path. The loser's cleanup
// deleted the object the winner's surviving row pointed at. Per-attempt paths
// mean the loser can only ever delete its own object.
test("a losing concurrent duplicate never deletes the winner's bytes", async () => {
  const target = adapter();
  const content = png();
  const [first, second] = await Promise.all([
    processMediaUploadFile(file("race-a.png", content), target),
    processMediaUploadFile(file("race-b.png", content), target),
  ]);
  const winners = [first, second].filter((item) => item.ok);
  const losers = [first, second].filter((item) => !item.ok);
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.equal(losers[0].code, "DUPLICATE_MEDIA");

  assert.equal(target.uploads.length, 2);
  assert.notEqual(target.uploads[0].path, target.uploads[1].path);
  assert.equal(target.records.length, 1);
  const survivingPath = target.records[0].storage_path;
  assert.ok(target.storage.has(survivingPath), "the surviving record points at bytes that were deleted");
  assert.ok(!target.removals.includes(survivingPath), "cleanup removed the winner's object");
  assert.equal(target.storage.size, 1);
});

test("per-attempt paths stay unique for identical filename and content", async () => {
  const target = adapter();
  const content = png();
  await processMediaUploadFile(file("same.png", content), target);
  await processMediaUploadFile(file("same.png", content), adapter());
  const other = adapter();
  await processMediaUploadFile(file("same.png", content), other);
  assert.notEqual(target.uploads[0].path, other.uploads[0].path);
  assert.match(target.uploads[0].path, /^operator\/[0-9a-f]{16}-[0-9a-f]{32}-same\.png$/);
});

// 20260921000500 removed rights_status: an upload is publishable by the act of
// uploading it. What still matters here is that the server action goes through
// the shared upload processor rather than building its own insert, and that it
// takes no rights field back from the form.
test("upload server path goes through the shared upload processor", () => {
  const action = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const uploadSource = action.slice(0, action.indexOf("export async function deleteMediaWithFeedback"));
  assert.match(uploadSource, /processMediaUploadFile/);
  assert.ok(!/rights_status/.test(src), "upload-core writes rights_status again");
  assert.ok(!/rights_status/.test(uploadSource), "the upload action reads rights_status again");
});

// The transport contract: one image per Server Action request. The selection
// limit stays an aggregate rule, but the bytes never travel as one body.
test("the upload action accepts a single file, never an aggregated batch", () => {
  const action = fs.readFileSync(new URL("../lib/admin/media-actions.ts", import.meta.url), "utf8");
  const uploadSource = action.slice(0, action.indexOf("export async function deleteMediaWithFeedback"));
  assert.match(uploadSource, /formData\.get\("file"\)/);
  assert.ok(!/getAll\("files"\)/.test(uploadSource), "the action still reads an aggregated files list");
  assert.ok(!/uploadMediaBatch/.test(action), "the aggregate batch action is still exported");

  const component = fs.readFileSync(new URL("../components/admin/media-upload-dropzone.tsx", import.meta.url), "utf8");
  assert.match(component, /uploadMedia\(buildMediaUploadFormData\(file\)\)/);
  assert.ok(!/uploadMediaBatch/.test(component), "the dropzone still calls the aggregate action");
});

// The framework body limit has to clear the per-image limit, or a valid upload
// is rejected by transport before validation ever runs.
test("the Server Action body limit clears the enforced per-image limit", async () => {
  const config = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const match = config.match(/bodySizeLimit:\s*"(\d+)mb"/);
  assert.ok(match, "no serverActions bodySizeLimit is configured");
  const limitBytes = Number(match[1]) * 1024 * 1024;
  assert.ok(limitBytes > MAX_MEDIA_UPLOAD_BYTES, "the body limit does not clear the per-image limit");
  assert.ok(limitBytes < MAX_MEDIA_UPLOAD_BYTES * 2, "the body limit is far larger than one image needs");
});
