// A78: this file used to declare its own `MAX_MEDIA_SELECTION_FILES = 20`,
// independent of the limit the server enforced. Both are now the same
// constant. Re-exported under the old name so the dropzone keeps working.
import { MAX_MEDIA_UPLOAD_FILES } from "./upload-limits";

export const MAX_MEDIA_SELECTION_FILES = MAX_MEDIA_UPLOAD_FILES;

export type MediaUploadSelectionItem<TFile = File> = {
  id: string;
  file: TFile;
};

type MediaUploadResultLike = {
  results: Array<{ ok: boolean }>;
};

export function appendMediaSelection<TFile>(
  current: readonly MediaUploadSelectionItem<TFile>[],
  additions: readonly TFile[],
  createId: (file: TFile, index: number) => string,
) {
  return current.concat(additions.map((file, index) => ({ id: createId(file, index), file })));
}

export function removeMediaSelectionItem<TFile>(
  current: readonly MediaUploadSelectionItem<TFile>[],
  id: string,
) {
  return current.filter((item) => item.id !== id);
}

export function clearMediaSelection<TFile>() {
  return [] as MediaUploadSelectionItem<TFile>[];
}

export function mediaSelectionState(count: number) {
  const overLimit = count > MAX_MEDIA_SELECTION_FILES;
  return {
    overLimit,
    canSubmit: count > 0 && !overLimit,
    message: overLimit
      ? `Select no more than ${MAX_MEDIA_SELECTION_FILES} images per upload. Remove ${count - MAX_MEDIA_SELECTION_FILES} ${count - MAX_MEDIA_SELECTION_FILES === 1 ? "file" : "files"} to continue.`
      : null,
  };
}

export function buildMediaUploadFormData<TFile extends Blob>(files: readonly TFile[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return formData;
}

export function summarizeMediaUploadBatch(result: MediaUploadResultLike) {
  const uploaded = result.results.filter((item) => item.ok).length;
  const failed = result.results.length - uploaded;
  const uploadedText = uploaded === 1 ? "1 image uploaded." : `${uploaded} images uploaded.`;
  const failedText = failed === 0 ? "" : failed === 1 ? " 1 file could not be uploaded." : ` ${failed} files could not be uploaded.`;
  return uploadedText + failedText;
}
