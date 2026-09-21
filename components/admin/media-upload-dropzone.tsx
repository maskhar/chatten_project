"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { uploadMediaBatch } from "@/lib/admin/media-actions";
import {
  buildMediaUploadFormData,
  mediaSelectionState,
  MAX_MEDIA_SELECTION_FILES,
} from "@/lib/media/upload-selection";
import {
  createQueueItem,
  setQueueItemsUploading,
  applyUploadResults,
  formatFileSize,
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

  function appendFiles(files: File[]) {
    if (!files.length) return;
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
    setDragDepth((depth) => depth + 1);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragDepth((depth) => Math.max(0, depth - 1));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragDepth(0);
    appendFiles(Array.from(event.dataTransfer.files));
  }

  function clearQueue() {
    setQueueItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(id: string) {
    setQueueItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setUploading(true);
    setQueueItems((current) => setQueueItemsUploading(current));
    const files = queueItems.map((item) => item.file);
    try {
      const result = await uploadMediaBatch(buildMediaUploadFormData(files));
      setQueueItems((current) => applyUploadResults(current, result.results));
    } catch {
      setQueueItems((current) => current.map((item) => ({ ...item, status: "failed" as const, message: "Upload request failed." })));
    } finally {
      submittingRef.current = false;
      setUploading(false);
    }
  }

  const canModifyQueue = !uploading && !hasResults;

  return <form onSubmit={handleSubmit} className="h-fit grid gap-4 border border-line bg-sand p-6">
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl">Upload images</h2>
      {/* A77. This used to read "New uploads default to Needs Review." That
          was true until A67 removed the approval gate; afterwards it was a
          promise the system no longer kept — `processMediaUploadFile` returns
          status "uploaded" and the image is usable at once. "needs_review"
          now appears nowhere else in the codebase. */}
      <p className="mt-1 text-sm text-ink">Uploaded images are added to the Media Library and can be used right away.</p>
    </div>
    <label
      htmlFor="media-upload-files"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`grid min-h-52 cursor-pointer place-content-center gap-2 border-2 border-dashed px-5 py-8 text-center outline-none transition ${dragging ? "border-forest bg-white shadow-[inset_0_0_0_3px_var(--color-forest)]" : "border-line-deep bg-cream"}`}
    >
      <input ref={inputRef} id="media-upload-files" name="files" type="file" multiple accept={acceptedTypes} onChange={handleInputChange} disabled={!canModifyQueue} className="sr-only" />
      <span className="font-semibold">{dragging ? "Release to add images" : "Drag images here or choose files"}</span>
      <span className="text-sm text-ink">JPEG, PNG, WebP, or AVIF. Up to 10 MB per image.</span>
      <span className="text-xs font-semibold uppercase tracking-[.12em] text-clay">Maximum {MAX_MEDIA_SELECTION_FILES} files per upload</span>
    </label>
    {queueItems.length ? <div aria-live="polite" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{queueItems.length} {queueItems.length === 1 ? "file" : "files"} {hasResults ? "processed" : "selected"}</p>
        <button type="button" onClick={clearQueue} disabled={uploading} className="text-sm underline disabled:cursor-not-allowed disabled:opacity-60">{hasResults ? "Clear results" : "Clear selection"}</button>
      </div>
      <ul className="grid max-h-96 gap-2 overflow-y-auto">
        {queueItems.map((item) => {
          const statusLabel = item.status === "ready" ? "Ready" : item.status === "uploading" ? "Uploading" : item.status === "complete" ? "Complete" : "Failed";
          const statusColor = item.status === "complete" ? "text-green-800" : item.status === "failed" ? "text-red-800" : "text-ink";
          return <li key={item.id} className="grid gap-1 border border-line-soft bg-white px-3 py-2">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</span>
              {item.status === "ready" ? <button type="button" onClick={() => removeItem(item.id)} disabled={!canModifyQueue} className="shrink-0 text-sm text-red-800 underline disabled:cursor-not-allowed disabled:opacity-60">Remove</button> : null}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink">{formatFileSize(item.file.size)}</span>
              <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
            </div>
            {item.status === "failed" && item.message ? <p className="text-xs text-red-800">{item.message}</p> : null}
          </li>;
        })}
      </ul>
    </div> : <p className="text-sm text-ink">No files selected.</p>}
    {selection.message ? <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{selection.message}</p> : null}
    {hasResults ? <p role="status" className="border border-line bg-white px-3 py-2 text-sm font-medium">{summarizeQueueResults(queueItems)}</p> : null}
    <button type="submit" disabled={!selection.canSubmit || uploading || hasResults} className="bg-terracotta px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55">{uploading ? "Uploading..." : "Upload Images"}</button>
  </form>;
}
