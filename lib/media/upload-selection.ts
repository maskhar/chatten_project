// A78: this file used to declare its own `MAX_MEDIA_SELECTION_FILES = 20`,
// independent of the limit the server enforced. Both are now the same
// constant. Re-exported under the old name so the dropzone keeps working.
import { MAX_MEDIA_UPLOAD_FILES, formatMediaSizeLimit } from "./upload-limits";

export const MAX_MEDIA_SELECTION_FILES = MAX_MEDIA_UPLOAD_FILES;

export { formatMediaSizeLimit };

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
  const excess = count - MAX_MEDIA_SELECTION_FILES;
  return {
    overLimit,
    canSubmit: count > 0 && !overLimit,
    message: overLimit
      ? `Pilih maksimal ${MAX_MEDIA_SELECTION_FILES} gambar per unggahan. Hapus ${excess} berkas agar dapat melanjutkan.`
      : null,
  };
}

// One request carries exactly one image. Aggregating every selected file into a
// single multipart body made one 20-file selection exceed any practical Server
// Action body ceiling, so the whole selection failed as a unit even when each
// image was well inside the per-image limit.
export function buildMediaUploadFormData<TFile extends Blob>(file: TFile) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export function summarizeMediaUploadBatch(result: MediaUploadResultLike) {
  const uploaded = result.results.filter((item) => item.ok).length;
  const failed = result.results.length - uploaded;
  const uploadedText = `${uploaded} gambar berhasil diunggah.`;
  const failedText = failed === 0 ? "" : ` ${failed} berkas gagal diunggah.`;
  return uploadedText + failedText;
}
