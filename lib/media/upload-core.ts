import { createHash, randomUUID } from "node:crypto";

import { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES, formatMediaSizeLimit } from "./upload-limits";

export { MAX_MEDIA_UPLOAD_BYTES, MAX_MEDIA_UPLOAD_FILES };

const mediaExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

type MediaMimeType = keyof typeof mediaExtensions;

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
  width: number;
  height: number;
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
  remove(path: string): Promise<void | { error?: unknown }>;
};

export type MediaUploadFailureCode =
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_IMAGE"
  | "FILE_TOO_LARGE"
  | "DUPLICATE_MEDIA"
  | "STORAGE_UPLOAD_FAILED"
  | "MEDIA_RECORD_FAILED"
  | "CLEANUP_FAILED"
  | "BATCH_LIMIT_EXCEEDED"
  | "INVALID_UPLOAD_REQUEST";

export type MediaUploadFileResult =
  | { ok: true; filename: string; mediaId: string; status: "uploaded" }
  | { ok: false; filename: string; code: MediaUploadFailureCode; message: string };

export type MediaUploadBatchResult = {
  results: MediaUploadFileResult[];
  error?: { code: "EMPTY_BATCH" | "BATCH_LIMIT_EXCEEDED"; message: string };
};

type ImageDimensions = { width: number; height: number };
type ValidatedImage = { mimeType: MediaMimeType; dimensions: ImageDimensions };

function ascii(bytes: Uint8Array, start: number, end: number) {
  let value = "";
  for (let index = start; index < end; index += 1) value += String.fromCharCode(bytes[index] ?? 0);
  return value;
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function hasUsableDimensions(width: number, height: number) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 100_000 && height <= 100_000;
}

function pngCrc(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index] ?? 0;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(bytes: Uint8Array): ImageDimensions | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 45 || signature.some((value, index) => bytes[index] !== value)) return null;

  let offset = 8;
  let dimensions: ImageDimensions | null = null;
  let sawImageData = false;
  let sawEnd = false;

  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > bytes.length) return null;

    const type = ascii(bytes, typeStart, dataStart);
    const declaredCrc = new DataView(bytes.buffer, bytes.byteOffset + dataEnd, 4).getUint32(0);
    if (declaredCrc !== pngCrc(bytes, typeStart, dataEnd)) return null;
    if (!dimensions) {
      if (type !== "IHDR" || length !== 13) return null;
      const header = new DataView(bytes.buffer, bytes.byteOffset + dataStart, 8);
      const width = header.getUint32(0);
      const height = header.getUint32(4);
      if (!hasUsableDimensions(width, height)) return null;
      dimensions = { width, height };
    }
    if (type === "IDAT") sawImageData = true;
    if (type === "IEND") {
      if (length !== 0 || !sawImageData || chunkEnd !== bytes.length) return null;
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }

  return sawEnd ? dimensions : null;
}

function isJpegSof(marker: number) {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}

function validateJpeg(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  let dimensions: ImageDimensions | null = null;
  let sawScan = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0x00) return null;
    if (marker === 0xd9) return sawScan ? dimensions : null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    const dataStart = offset + 2;
    const dataEnd = dataStart + segmentLength - 2;
    if (segmentLength < 2 || dataEnd > bytes.length) return null;

    if (isJpegSof(marker)) {
      if (segmentLength < 8) return null;
      const height = ((bytes[dataStart + 1] ?? 0) << 8) | (bytes[dataStart + 2] ?? 0);
      const width = ((bytes[dataStart + 3] ?? 0) << 8) | (bytes[dataStart + 4] ?? 0);
      if (!hasUsableDimensions(width, height)) return null;
      dimensions = { width, height };
    }

    if (marker !== 0xda) {
      offset = dataEnd;
      continue;
    }

    if (!dimensions || segmentLength < 6) return null;
    sawScan = true;
    offset = dataEnd;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const markerStart = offset;
      while (bytes[offset] === 0xff) offset += 1;
      const scanMarker = bytes[offset];
      offset += 1;
      if (scanMarker === undefined) return null;
      if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) continue;
      if (scanMarker === 0xd9) return dimensions;
      offset = markerStart;
      break;
    }
  }

  return null;
}

function validateWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") return null;
  const header = new DataView(bytes.buffer, bytes.byteOffset, 12);
  if (header.getUint32(4, true) !== bytes.length - 8) return null;

  let offset = 12;
  let canvas: ImageDimensions | null = null;
  let image: ImageDimensions | null = null;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, offset + 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const paddedEnd = dataEnd + (length % 2);
    if (dataEnd < dataStart || paddedEnd > bytes.length) return null;

    if (type === "VP8 ") {
      if (length < 10 || bytes[dataStart + 3] !== 0x9d || bytes[dataStart + 4] !== 0x01 || bytes[dataStart + 5] !== 0x2a) return null;
      const width = new DataView(bytes.buffer, bytes.byteOffset + dataStart + 6, 2).getUint16(0, true) & 0x3fff;
      const height = new DataView(bytes.buffer, bytes.byteOffset + dataStart + 8, 2).getUint16(0, true) & 0x3fff;
      if (!hasUsableDimensions(width, height)) return null;
      image = { width, height };
    }
    if (type === "VP8L") {
      if (length < 5 || bytes[dataStart] !== 0x2f) return null;
      const packed = new DataView(bytes.buffer, bytes.byteOffset + dataStart + 1, 4).getUint32(0, true);
      const width = (packed & 0x3fff) + 1;
      const height = ((packed >>> 14) & 0x3fff) + 1;
      if (!hasUsableDimensions(width, height)) return null;
      image = { width, height };
    }
    if (type === "VP8X") {
      if (length < 10) return null;
      const width = readUint24LE(bytes, dataStart + 4) + 1;
      const height = readUint24LE(bytes, dataStart + 7) + 1;
      if (!hasUsableDimensions(width, height)) return null;
      canvas = { width, height };
    }
    offset = paddedEnd;
  }

  if (offset !== bytes.length || !image) return null;
  if (canvas && (canvas.width !== image.width || canvas.height !== image.height)) return null;
  return image;
}

type IsoBox = { type: string; dataStart: number; end: number };

function readIsoBoxes(bytes: Uint8Array, start: number, end: number): IsoBox[] | null {
  const boxes: IsoBox[] = [];
  let offset = start;
  while (offset < end) {
    if (offset + 8 > end) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    let size = view.getUint32(0);
    const type = ascii(bytes, offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) return null;
      const largeSize = new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 8).getBigUint64(0);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(largeSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) return null;
    boxes.push({ type, dataStart: offset + headerSize, end: offset + size });
    offset += size;
  }
  return boxes;
}

function locateIspe(bytes: Uint8Array, boxes: readonly IsoBox[]): ImageDimensions | null {
  for (const box of boxes) {
    if (box.type === "ispe") {
      if (box.end - box.dataStart < 12) return null;
      const view = new DataView(bytes.buffer, bytes.byteOffset + box.dataStart + 4, 8);
      const width = view.getUint32(0);
      const height = view.getUint32(4);
      return hasUsableDimensions(width, height) ? { width, height } : null;
    }
    if (["iprp", "ipco"].includes(box.type)) {
      const children = readIsoBoxes(bytes, box.dataStart, box.end);
      if (!children) return null;
      const dimensions = locateIspe(bytes, children);
      if (dimensions) return dimensions;
    }
  }
  return null;
}

function validateAvif(bytes: Uint8Array): ImageDimensions | null {
  const topLevel = readIsoBoxes(bytes, 0, bytes.length);
  if (!topLevel) return null;
  const fileType = topLevel.find((box) => box.type === "ftyp");
  const meta = topLevel.find((box) => box.type === "meta");
  const mediaData = topLevel.find((box) => box.type === "mdat");
  if (!fileType || !meta || !mediaData || fileType.end - fileType.dataStart < 8 || mediaData.end === mediaData.dataStart) return null;

  const compatibleBrands: string[] = [];
  for (let offset = fileType.dataStart; offset + 4 <= fileType.end; offset += 4) compatibleBrands.push(ascii(bytes, offset, offset + 4));
  if (!compatibleBrands.includes("avif") && !compatibleBrands.includes("avis")) return null;
  if (meta.end - meta.dataStart < 4) return null;
  const metaChildren = readIsoBoxes(bytes, meta.dataStart + 4, meta.end);
  if (!metaChildren) return null;
  return locateIspe(bytes, metaChildren);
}

function detectedMime(bytes: Uint8Array): MediaMimeType | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp" && (ascii(bytes, 8, 12) === "avif" || ascii(bytes, 8, 12) === "avis")) return "image/avif";
  return null;
}

function validateImage(bytes: Uint8Array): ValidatedImage | null {
  const mimeType = detectedMime(bytes);
  if (!mimeType) return null;
  const dimensions = mimeType === "image/jpeg"
    ? validateJpeg(bytes)
    : mimeType === "image/png"
      ? validatePng(bytes)
      : mimeType === "image/webp"
        ? validateWebp(bytes)
        : validateAvif(bytes);
  return dimensions ? { mimeType, dimensions } : null;
}

function safeStoragePath(filename: string, sha256: string, mimeType: MediaMimeType) {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "upload";
  const attemptId = randomUUID().replace(/-/g, "");
  return `operator/${sha256.slice(0, 16)}-${attemptId}-${stem}.${mediaExtensions[mimeType]}`;
}

function failure(filename: string, code: MediaUploadFailureCode, message: string): MediaUploadFileResult {
  return { ok: false, filename, code, message };
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}

async function removeOwnedUpload(adapter: MediaUploadAdapter, path: string) {
  try {
    const result = await adapter.remove(path);
    return !result?.error;
  } catch {
    return false;
  }
}

async function postUploadFailure(filename: string, error: unknown, adapter: MediaUploadAdapter, ownedStoragePath: string): Promise<MediaUploadFileResult> {
  const cleanedUp = await removeOwnedUpload(adapter, ownedStoragePath);
  if (!cleanedUp) return failure(filename, "CLEANUP_FAILED", "Metadata gambar gagal disimpan dan berkas unggahan tidak dapat dibersihkan dari Storage. Hubungi administrator.");
  if (isDuplicateError(error)) return failure(filename, "DUPLICATE_MEDIA", "Gambar ini sudah ada di Pustaka Media.");
  return failure(filename, "MEDIA_RECORD_FAILED", "Metadata gambar tidak dapat disimpan. Berkas unggahan telah dibersihkan dari Storage.");
}

export async function processMediaUploadFile(file: MediaUploadFile, adapter: MediaUploadAdapter, metadata: MediaUploadMetadata = {}): Promise<MediaUploadFileResult> {
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) return failure(file.name, "FILE_TOO_LARGE", `Ukuran tiap gambar maksimal ${formatMediaSizeLimit()}.`);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return failure(file.name, "INVALID_IMAGE", "Berkas gambar tidak dapat dibaca.");
  }

  if (bytes.byteLength !== file.size) return failure(file.name, "INVALID_IMAGE", "Ukuran berkas gambar tidak valid.");
  const image = validateImage(bytes);
  if (!image) {
    const mimeType = detectedMime(bytes);
    return mimeType
      ? failure(file.name, "INVALID_IMAGE", "Struktur atau dimensi gambar tidak valid.")
      : failure(file.name, "UNSUPPORTED_MEDIA_TYPE", "Unggah gambar JPEG, PNG, WebP, atau AVIF.");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    const duplicate = await adapter.findBySha256(sha256);
    if (duplicate) return failure(file.name, "DUPLICATE_MEDIA", "Gambar ini sudah ada di Pustaka Media.");
  } catch {
    return failure(file.name, "MEDIA_RECORD_FAILED", "Duplikasi gambar tidak dapat diverifikasi dengan aman.");
  }

  const storagePath = safeStoragePath(file.name, sha256, image.mimeType);
  try {
    const upload = await adapter.upload(storagePath, bytes, image.mimeType);
    if (upload.error) return failure(file.name, "STORAGE_UPLOAD_FAILED", "Gambar tidak dapat diunggah ke Storage.");
  } catch {
    return failure(file.name, "STORAGE_UPLOAD_FAILED", "Gambar tidak dapat diunggah ke Storage.");
  }

  try {
    const insert = await adapter.insert({
      bucket: "chatten-media",
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: image.mimeType,
      file_size: file.size,
      width: image.dimensions.width,
      height: image.dimensions.height,
      alt_text: metadata.altText?.trim() || null,
      title: metadata.title?.trim() || file.name,
      source_type: "operator-upload",
      sha256,
      tags: [],
    });
    if (insert.error || !insert.id) return postUploadFailure(file.name, insert.error, adapter, storagePath);
    return { ok: true, filename: file.name, mediaId: insert.id, status: "uploaded" };
  } catch (error) {
    return postUploadFailure(file.name, error, adapter, storagePath);
  }
}

// Batch processing remains a pure server helper for bounded selection checks.
// Browser transport invokes processMediaUploadFile through one Server Action per
// file, so multipart bodies never contain all selected image bytes together.
export async function processMediaUploadBatch(files: readonly MediaUploadFile[], adapter: MediaUploadAdapter, metadata: MediaUploadMetadata = {}): Promise<MediaUploadBatchResult> {
  if (!files.length) return { results: [], error: { code: "EMPTY_BATCH", message: "Pilih minimal satu gambar untuk diunggah." } };
  if (files.length > MAX_MEDIA_UPLOAD_FILES) {
    const message = `Unggah maksimal ${MAX_MEDIA_UPLOAD_FILES} gambar dalam satu pilihan.`;
    return { results: files.map((file) => failure(file.name, "BATCH_LIMIT_EXCEEDED", message)), error: { code: "BATCH_LIMIT_EXCEEDED", message } };
  }
  const results: MediaUploadFileResult[] = [];
  for (const file of files) results.push(await processMediaUploadFile(file, adapter, metadata));
  return { results };
}
