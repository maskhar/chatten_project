"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { uploadMedia } from "@/lib/admin/media-actions";
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
  setQueueItemsUploading,
  summarizeQueueResults,
  type UploadQueueItem,
} from "@/lib/media/upload-queue";

const acceptedTypes = "image/jpeg,image/png,image/webp,image/avif";

export function MediaUploadDropzone() {
  const [queueItems, setQueueItems] = useState<UploadQueueItem[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const nextIdRef = useRef(0);
  const selection = mediaSelectionState(queueItems.length);
  const dragging = dragDepth > 0;
  const hasResults = queueItems.some((item) => item.status === "complete" || item.status === "failed");
  const canModifyQueue = !uploading && !hasResults;

  function appendFiles(files: File[]) {
    if (!canModifyQueue || !files.length) return;
    setQueueItems((current) => {
      const newItems = files.map((file) => createQueueItem(`${nextIdRef.current++}-${file.name}`, file));
      return current.concat(newItems);
    });
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

  function removeItem(id: string) {
    if (!canModifyQueue) return;
    setQueueItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.canSubmit || submittingRef.current || hasResults) return;

    submittingRef.current = true;
    setUploading(true);
    const items = queueItems.map((item) => ({ id: item.id, file: item.file }));
    setQueueItems((current) => setQueueItemsUploading(current));

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
      setUploading(false);
    }
  }

  return <form onSubmit={handleSubmit} className="h-fit grid gap-4 border border-line bg-sand p-6">
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
    {queueItems.length ? <div aria-live="polite" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{queueItems.length} {queueItems.length === 1 ? "berkas" : "berkas"} {hasResults ? "selesai diproses" : "dipilih"}</p>
        <button type="button" onClick={clearQueue} disabled={!canModifyQueue} className="text-sm underline disabled:cursor-not-allowed disabled:opacity-60">{hasResults ? "Hasil terkunci" : "Kosongkan pilihan"}</button>
      </div>
      <ul className="grid max-h-96 gap-2 overflow-y-auto">
        {queueItems.map((item) => {
          const statusLabel = item.status === "ready" ? "Siap" : item.status === "uploading" ? "Mengunggah" : item.status === "complete" ? "Berhasil" : "Gagal";
          const statusColor = item.status === "complete" ? "text-green-800" : item.status === "failed" ? "text-red-800" : "text-ink";
          return <li key={item.id} className="grid gap-1 border border-line-soft bg-white px-3 py-2">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</span>
              {item.status === "ready" ? <button type="button" onClick={() => removeItem(item.id)} disabled={!canModifyQueue} className="shrink-0 text-sm text-red-800 underline disabled:cursor-not-allowed disabled:opacity-60">Hapus</button> : null}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink">{formatFileSize(item.file.size)}</span>
              <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
            </div>
            {item.status === "failed" && item.message ? <p className="text-xs text-red-800">{item.message}</p> : null}
          </li>;
        })}
      </ul>
    </div> : <p className="text-sm text-ink">Belum ada berkas dipilih.</p>}
    {selection.message ? <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{selection.message}</p> : null}
    {hasResults ? <p role="status" className="border border-line bg-white px-3 py-2 text-sm font-medium">{summarizeQueueResults(queueItems)}</p> : null}
    <button type="submit" disabled={!selection.canSubmit || uploading || hasResults} className="bg-terracotta px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55">{uploading ? "Mengunggah..." : "Unggah gambar"}</button>
  </form>;
}
