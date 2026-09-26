// A91 (lanjutan). Antrean unggah punya satu cacat yang mendasari semua gejala
// lainnya: "ada hasil" diperlakukan sama dengan "sudah selesai".
//
// Setiap berkas dikirim dalam request-nya sendiri dan diselesaikan sendiri, jadi
// pada 20 berkas yang berjalan paralel, berkas pertama yang selesai sudah
// membuat `hasResults` benar. Akibatnya ringkasan "N gambar berhasil diunggah"
// muncul saat 19 berkas lain masih berjalan — angkanya benar hanya untuk satu
// tick — dan antrean langsung dikunci menjadi `Hasil terkunci`, sehingga satu
// berkas gagal di antara sembilan belas yang berhasil hanya bisa diulang dengan
// memuat ulang halaman dan memilih ulang semua berkas.
//
// Kuncinya adalah dua predikat yang berbeda: `isQueueUploading` (masih ada yang
// berjalan) dan `isQueueSettled` (setiap baris sudah punya hasil). Ringkasan
// hanya milik keadaan kedua.
//
// `retryFailedQueueItems` menyelesaikan sisanya. Ia membuang baris yang berhasil
// — berkasnya sudah ada di Pustaka Media, mengirimnya lagi hanya akan ditolak
// sebagai duplikat — dan menyisakan baris gagal dalam keadaan `ready`. Bersama
// `startQueueUpload`, yang hanya menyentuh baris `ready`, berkas yang sudah
// berhasil tidak dapat terkirim dua kali walaupun masih terlihat di daftar.

export type UploadQueueItemStatus = "ready" | "uploading" | "complete" | "failed";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: UploadQueueItemStatus;
  code?: string;
  message?: string;
  mediaId?: string;
};

export type UploadItemOutcome = {
  ok: boolean;
  filename?: string;
  mediaId?: string;
  code?: string;
  message?: string;
};

export type UploadQueueCounts = {
  total: number;
  ready: number;
  uploading: number;
  complete: number;
  failed: number;
};

export function createQueueItem(id: string, file: File): UploadQueueItem {
  return { id, file, status: "ready" };
}

/** A row that already has its outcome and will never change again on its own. */
export function isTerminalQueueItem(item: UploadQueueItem): boolean {
  return item.status === "complete" || item.status === "failed";
}

export function queueCounts(items: readonly UploadQueueItem[]): UploadQueueCounts {
  const counts: UploadQueueCounts = { total: items.length, ready: 0, uploading: 0, complete: 0, failed: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/** True while at least one request is still in flight. */
export function isQueueUploading(items: readonly UploadQueueItem[]): boolean {
  return items.some((item) => item.status === "uploading");
}

/**
 * True only when every row has an outcome. This is the gate for the summary:
 * a partial count reported mid-batch is wrong for every tick but one.
 */
export function isQueueSettled(items: readonly UploadQueueItem[]): boolean {
  return items.length > 0 && items.every(isTerminalQueueItem);
}

/** The rows the next submission will send. */
export function readyQueueItems(items: readonly UploadQueueItem[]): UploadQueueItem[] {
  return items.filter((item) => item.status === "ready");
}

/**
 * Marks only the rows that are waiting. A `complete` row must never be sent
 * again — its bytes are already in the Media Library, so a second request can
 * only be refused as a duplicate while looking to the operator like a new error.
 */
export function startQueueUpload(items: readonly UploadQueueItem[]): UploadQueueItem[] {
  return items.map((item) => (item.status === "ready" ? { ...item, status: "uploading" as const } : item));
}

/**
 * Keeps the failures, drops everything else, and resets them to `ready` with
 * their previous error cleared. Returns an empty queue when nothing failed, so
 * the caller can treat "nothing to retry" as a normal outcome.
 */
export function retryFailedQueueItems(items: readonly UploadQueueItem[]): UploadQueueItem[] {
  return items
    .filter((item) => item.status === "failed")
    .map((item) => ({ id: item.id, file: item.file, status: "ready" as const }));
}

// Each file is uploaded in its own request, so its queue row is settled on its
// own. Rewriting the whole queue from one aggregate response used to discard an
// already-finished sibling's outcome whenever a later request changed the list.
export function applyUploadOutcome(
  items: readonly UploadQueueItem[],
  id: string,
  outcome: UploadItemOutcome,
): UploadQueueItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (outcome.ok) return { ...item, status: "complete" as const, code: undefined, message: undefined, mediaId: outcome.mediaId };
    return { ...item, status: "failed" as const, code: outcome.code, message: outcome.message, mediaId: undefined };
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function summarizeQueueResults(items: readonly UploadQueueItem[]): string {
  const { complete, failed } = queueCounts(items);
  const uploaded = complete === 0
    ? "Tidak ada gambar yang berhasil diunggah."
    : `${complete} gambar berhasil diunggah.`;
  if (failed === 0) return uploaded;
  return `${uploaded} ${failed} berkas gagal. Pilih Ulangi berkas gagal untuk mencoba lagi tanpa mengunggah ulang yang berhasil.`;
}

/**
 * The single sentence the live region carries.
 *
 * It is deliberately constant for the whole duration of a batch. Reporting
 * progress per completed file would re-announce the region up to twenty times
 * in a row, which is noise rather than information; the batch is worth one
 * announcement when it starts and one when it finishes.
 */
export function queueStatusMessage(items: readonly UploadQueueItem[]): string {
  if (isQueueUploading(items)) return `Mengunggah ${queueCounts(items).total} berkas…`;
  if (isQueueSettled(items)) return summarizeQueueResults(items);
  return "";
}
