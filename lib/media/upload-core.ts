import { createHash } from "node:crypto";

// A78: the limits live in upload-limits.ts so the browser can import the same
// numbers this module enforces. Re-exported because callers already import
// them from here.
import { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES, formatMediaSizeLimit } from "./upload-limits";

export { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES };

const mediaExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type MediaUploadFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type MediaUploadMetadata = {
  title?: string | null;
  altText?: string | null;
};

export type MediaUploadRecord = {
  bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  title: string;
  source_type: "operator-upload";
  sha256: string;
  tags: string[];
};

export type MediaUploadAdapter = {
  findBySha256(sha256: string): Promise<{ id: string } | null>;
  upload(path: string, content: Uint8Array, contentType: string): Promise<{ error?: unknown }>;
  insert(record: MediaUploadRecord): Promise<{ id?: string; error?: unknown }>;
  remove(path: string): Promise<void>;
};

export type MediaUploadFileResult =
  | { ok: true; filename: string; mediaId: string; status: "uploaded" }
  | { ok: false; filename: string; code: "UNSUPPORTED_MEDIA_TYPE" | "FILE_TOO_LARGE" | "DUPLICATE_MEDIA" | "STORAGE_UPLOAD_FAILED" | "MEDIA_RECORD_FAILED" | "BATCH_LIMIT_EXCEEDED"; message: string };

export type MediaUploadBatchResult = {
  results: MediaUploadFileResult[];
  error?: { code: "EMPTY_BATCH" | "BATCH_LIMIT_EXCEEDED"; message: string };
};

function detectedMime(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" && String.fromCharCode(...bytes.slice(8, 12)).includes("avif")) return "image/avif";
  return null;
}

function imageDimensions(bytes: Uint8Array, mimeType: string) {
  if (mimeType !== "image/png") return { width: null, height: null };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function safeStoragePath(filename: string, sha256: string, mimeType: string) {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload";
  return "operator/" + sha256.slice(0, 16) + "-" + stem + "." + mediaExtensions[mimeType];
}

function failure(filename: string, code: Extract<MediaUploadFileResult, { ok: false }> ["code"], message: string): MediaUploadFileResult {
  return { ok: false, filename, code, message };
}

export async function processMediaUploadFile(file: MediaUploadFile, adapter: MediaUploadAdapter, metadata: MediaUploadMetadata = {}): Promise<MediaUploadFileResult> {
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) return failure(file.name, "FILE_TOO_LARGE", `Each image must be ${formatMediaSizeLimit()} or smaller.`);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectedMime(bytes);
  if (!mimeType || !mediaExtensions[mimeType]) return failure(file.name, "UNSUPPORTED_MEDIA_TYPE", "Upload a JPEG, PNG, WebP, or AVIF image.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const duplicate = await adapter.findBySha256(sha256);
  if (duplicate) return failure(file.name, "DUPLICATE_MEDIA", "This image already exists in the Media Library.");
  const storagePath = safeStoragePath(file.name, sha256, mimeType);
  const upload = await adapter.upload(storagePath, bytes, mimeType);
  if (upload.error) return failure(file.name, "STORAGE_UPLOAD_FAILED", "Unable to upload this image to Storage.");
  const dimensions = imageDimensions(bytes, mimeType);
  const insert = await adapter.insert({
    bucket: "chatten-media",
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: mimeType,
    file_size: file.size,
    width: dimensions.width,
    height: dimensions.height,
    alt_text: metadata.altText?.trim() || null,
    title: metadata.title?.trim() || file.name,
    source_type: "operator-upload",
    sha256,
    tags: [],
  });
  if (insert.error || !insert.id) {
    await adapter.remove(storagePath);
    return failure(file.name, "MEDIA_RECORD_FAILED", "Unable to save this image in the Media Library.");
  }
    return { ok: true, filename: file.name, mediaId: insert.id, status: "uploaded" };
  } catch {
    return failure(file.name, "MEDIA_RECORD_FAILED", "Unable to process this image safely.");
  }
}

export async function processMediaUploadBatch(files: readonly MediaUploadFile[], adapter: MediaUploadAdapter, metadata: MediaUploadMetadata = {}): Promise<MediaUploadBatchResult> {
  if (!files.length) return { results: [], error: { code: "EMPTY_BATCH", message: "Choose at least one image to upload." } };
  if (files.length > MAX_MEDIA_UPLOAD_FILES) return { results: files.map((file) => failure(file.name, "BATCH_LIMIT_EXCEEDED", "Upload no more than " + MAX_MEDIA_UPLOAD_FILES + " images at once.")), error: { code: "BATCH_LIMIT_EXCEEDED", message: "Upload no more than " + MAX_MEDIA_UPLOAD_FILES + " images at once." } };
  const results: MediaUploadFileResult[] = [];
  for (const file of files) results.push(await processMediaUploadFile(file, adapter, metadata));
  return { results };
}
