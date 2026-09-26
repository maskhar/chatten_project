"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { uploadMedia } from "@/lib/admin/media-actions";
import { ROW_ACTION_BORDERED, ROW_ACTION_DANGER, TAP_TARGET } from "@/components/ui/control";
import {
  buildMediaUploadFormData,
  formatMediaSizeLimit,
  mediaSelectionState,
  MAX_MEDIA_SELECTION_FILES,
} from "@/lib/media/upload-selection";
import {
  applyUploadOutcome,
  createQueueItem,
  formatFileSize,
  isQueueSettled,
  isQueueUploading,
  queueCounts,
  queueStatusMessage,
  readyQueueItems,
  retryFailedQueueItems,
  startQueueUpload,
  summarizeQueueResults,
  type UploadQueueItem,
} from "@/lib/media/upload-queue";

const acceptedTypes = "image/jpeg,image/png,image/webp,image/avif";

const STATUS_LABEL: Record<UploadQueueItem["status"], string> = {
  ready: "Siap",
  uploading: "Mengunggah",
  complete: "Berhasil",
  failed: "Gagal",
};

// Warna bukan satu-satunya penanda: setiap baris selalu menuliskan statusnya.
// Token dipakai, bukan `text-green-800`/`text-red-800` mentah, supaya baris ini
// ikut terikat pada gerbang kontras tests/palette.test.mjs.
const STATUS_COLOR: Record<UploadQueueItem["status"], string> = {
  ready: "text-ink",
  uploading: "text-ink",
  complete: "text-leaf",
  failed: "text-rust",
};

export function MediaUploadDropzone() {
  const [queueItems, setQueueItems] = useState<UploadQueueItem[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const nextIdRef = useRef(0);

  const uploading = isQueueUploading(queueItems);
  const settled = isQueueSettled(queueItems);
  const counts = queueCounts(queueItems);
  const pendingCount = readyQueueItems(queueItems).length;
  const selection = mediaSelectionState(pendingCount);
  const dragging = dragDepth > 0;

  // Antrean hanya terkunci selama request berjalan. Setelah setiap baris punya
  // hasil, operator harus tetap bisa menambah berkas, mengosongkan antrean, atau
  // mengulang hanya yang gagal — sebelumnya keadaan ini justru mati total.
  const canModifyQueue = !uploading;
  const statusMessage = queueStatusMessage(queueItems);

  function appendFiles(files: File[]) {
    if (!canModifyQueue || !files.length) return;
    setQueueItems((current) => current.concat(
      files.map((file) => createQueueItem(`${nextIdRef.current++}-${file.name}`, file)),
    ));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    appendFiles(Array.from(event.target.files ?? []));
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (canModifyQueue) setDragDepth((depth) => depth + 1);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (canModifyQueue) setDragDepth((depth) => Math.max(0, depth - 1));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!canModifyQueue) return;
    setDragDepth(0);
    appendFiles(Array.from(event.dataTransfer.files));
  }

  function clearQueue() {
    if (!canModifyQueue) return;
    setQueueItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Hanya baris gagal yang bertahan, dan kembali ke keadaan `ready`. Baris yang
  // berhasil dibuang: berkasnya sudah ada di Pustaka Media, jadi mengirim ulang
  // hanya akan ditolak sebagai duplikat dan terlihat seperti kegagalan baru.
  function retryFailed() {
    if (!canModifyQueue) return;
    setQueueItems((current) => retryFailedQueueItems(current));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    if (!canModifyQueue) return;
    setQueueItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.canSubmit || submittingRef.current) return;

    submittingRef.current = true;
    // Hanya baris `ready` yang dikirim, dibaca sebelum state berubah supaya
    // daftar request tidak pernah memuat baris yang sudah berhasil.
    const items = readyQueueItems(queueItems).map((item) => ({ id: item.id, file: item.file }));
    if (!items.length) {
      submittingRef.current = false;
      return;
    }
    setQueueItems((current) => startQueueUpload(current));

    try {
      await Promise.all(items.map(async ({ id, file }) => {
        try {
          // One File per FormData and one Server Action invocation. Never
          // concatenate selected image bodies into a batch request.
          const result = await uploadMedia(buildMediaUploadFormData(file));
          setQueueItems((current) => applyUploadOutcome(current, id, result));
        } catch {
          setQueueItems((current) => applyUploadOutcome(current, id, {
            ok: false,
            code: "INVALID_UPLOAD_REQUEST",
            message: "Permintaan unggah gagal. Coba lagi nanti.",
          }));
        }
      }));
    } finally {
      submittingRef.current = false;
    }
  }

  return <form onSubmit={handleSubmit} aria-busy={uploading} className="h-fit grid gap-4 border border-line bg-sand p-6">
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl">Unggah gambar</h2>
      <p className="mt-1 text-sm text-ink">Gambar yang berhasil diunggah masuk ke Pustaka Media dan dapat langsung digunakan.</p>
    </div>
    <label
      htmlFor="media-upload-files"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={!canModifyQueue}
      className={`grid min-h-52 place-content-center gap-2 border-2 border-dashed px-5 py-8 text-center outline-none transition ${canModifyQueue ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${dragging ? "border-forest bg-white shadow-[inset_0_0_0_3px_var(--color-forest)]" : "border-line-deep bg-cream"}`}
    >
      <input ref={inputRef} id="media-upload-files" name="files" type="file" multiple accept={acceptedTypes} onChange={handleInputChange} disabled={!canModifyQueue} className="sr-only" />
      <span className="font-semibold">{dragging ? "Lepaskan untuk menambahkan gambar" : "Tarik gambar ke sini atau pilih berkas"}</span>
      <span className="text-sm text-ink">JPEG, PNG, WebP, atau AVIF. Maksimal {formatMediaSizeLimit()} per gambar.</span>
      <span className="text-xs font-semibold uppercase tracking-[.12em] text-clay">Maksimal {MAX_MEDIA_SELECTION_FILES} berkas per unggahan</span>
    </label>

    {/* Satu live region untuk seluruh antrean, isinya dikendalikan oleh
        queueStatusMessage: satu pengumuman saat batch mulai dan satu saat batch
        benar-benar selesai. Sebelumnya seluruh daftar berkas berada di dalam
        aria-live, sehingga setiap perubahan status satu baris membacakan ulang
        dua puluh baris sekaligus. Region tetap ada di DOM saat kosong; region
        yang baru muncul bersamaan dengan isinya sering tidak terbacakan. */}
    <p role="status" aria-live="polite" className="sr-only">{statusMessage}</p>

    {queueItems.length ? <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {counts.total} berkas {settled ? "selesai diproses" : uploading ? "sedang diunggah" : "dipilih"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {counts.failed ? <button type="button" onClick={retryFailed} disabled={!canModifyQueue} className={`${ROW_ACTION_BORDERED} disabled:cursor-not-allowed`}>Ulangi {counts.failed} berkas gagal</button> : null}
          <button type="button" onClick={clearQueue} disabled={!canModifyQueue} className={`${ROW_ACTION_BORDERED} disabled:cursor-not-allowed`}>Kosongkan antrean</button>
        </div>
      </div>
      <ul className="grid max-h-96 gap-2 overflow-y-auto">
        {queueItems.map((item) => <li key={item.id} className="grid gap-1 border border-line-soft bg-white px-3 py-2">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</span>
            {item.status === "uploading" || item.status === "complete" ? null : <button type="button" onClick={() => removeItem(item.id)} disabled={!canModifyQueue} className={`${ROW_ACTION_DANGER} shrink-0 disabled:cursor-not-allowed disabled:opacity-60`}>Hapus dari antrean</button>}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-ink">{formatFileSize(item.file.size)}</span>
            <span aria-busy={item.status === "uploading"} className={`font-semibold ${STATUS_COLOR[item.status]}`}>{STATUS_LABEL[item.status]}</span>
          </div>
          {item.status === "failed" && item.message ? <p className="text-xs text-rust">{item.message}</p> : null}
        </li>)}
      </ul>
    </div> : <p className="text-sm text-ink">Belum ada berkas dipilih.</p>}

    {selection.message ? <p role="alert" className="border border-terracotta bg-blush px-3 py-2 text-sm text-rust">{selection.message}</p> : null}

    {/* Ringkasan hanya setelah setiap baris punya hasil. Sebelumnya `hasResults`
        sudah benar begitu satu berkas selesai, sehingga pada dua puluh berkas
        paralel ringkasan muncul dengan angka yang hanya benar untuk satu tick. */}
    {settled ? <p className={`border px-3 py-2 text-sm font-medium ${counts.failed ? "border-terracotta bg-blush text-rust" : "border-line bg-white"}`}>{summarizeQueueResults(queueItems)}</p> : null}

    <button type="submit" disabled={!selection.canSubmit || uploading} className={`${TAP_TARGET} justify-center bg-terracotta px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55`}>
      {uploading ? "Mengunggah…" : pendingCount && counts.total !== pendingCount ? `Unggah ${pendingCount} berkas tersisa` : "Unggah gambar"}
    </button>
  </form>;
}
