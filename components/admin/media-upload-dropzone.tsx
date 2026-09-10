"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { uploadMediaBatch } from "@/lib/admin/media-actions";
import {
  appendMediaSelection,
  buildMediaUploadFormData,
  clearMediaSelection,
  mediaSelectionState,
  removeMediaSelectionItem,
  summarizeMediaUploadBatch,
  type MediaUploadSelectionItem,
} from "@/lib/media/upload-selection";

const acceptedTypes = "image/jpeg,image/png,image/webp,image/avif";

export function MediaUploadDropzone() {
  const [selectedFiles, setSelectedFiles] = useState<MediaUploadSelectionItem[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const nextIdRef = useRef(0);
  const selection = mediaSelectionState(selectedFiles.length);
  const dragging = dragDepth > 0;

  function appendFiles(files: File[]) {
    if (!files.length) return;
    setFeedback(null);
    setSelectedFiles((current) => appendMediaSelection(current, files, (file) => `${nextIdRef.current++}-${file.name}`));
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

  function clearSelection() {
    setSelectedFiles(clearMediaSelection());
    setFeedback(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setUploading(true);
    setFeedback(null);
    const files = selectedFiles.map((item) => item.file);
    try {
      const result = await uploadMediaBatch(buildMediaUploadFormData(files));
      setFeedback(summarizeMediaUploadBatch(result));
      setSelectedFiles(clearMediaSelection());
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setFeedback("Images could not be uploaded. Try again.");
    } finally {
      submittingRef.current = false;
      setUploading(false);
    }
  }

  return <form onSubmit={handleSubmit} className="h-fit grid gap-4 border border-[#c9bfa8] bg-[#e8dfca] p-6">
    <div>
      <h2 className="font-serif text-3xl">Upload images</h2>
      <p className="mt-1 text-sm text-[#596052]">New uploads default to Needs Review.</p>
    </div>
    <label
      htmlFor="media-upload-files"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`grid min-h-52 cursor-pointer place-content-center gap-2 border-2 border-dashed px-5 py-8 text-center outline-none transition ${dragging ? "border-[#1f3426] bg-white shadow-[inset_0_0_0_3px_#1f3426]" : "border-[#9b8f74] bg-[#f7f1e5]"}`}
    >
      <input ref={inputRef} id="media-upload-files" name="files" type="file" multiple accept={acceptedTypes} onChange={handleInputChange} className="sr-only" />
      <span className="font-semibold">{dragging ? "Release to add images" : "Drag images here or choose files"}</span>
      <span className="text-sm text-[#596052]">JPEG, PNG, WebP, or AVIF. Up to 10 MB per image.</span>
      <span className="text-xs font-semibold uppercase tracking-[.12em] text-[#76503f]">Maximum 20 files per upload</span>
    </label>
    {selectedFiles.length ? <div aria-live="polite" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected</p>
        <button type="button" onClick={clearSelection} disabled={uploading} className="text-sm underline disabled:cursor-not-allowed disabled:opacity-60">Clear selection</button>
      </div>
      <ul className="grid max-h-56 gap-2 overflow-y-auto">
        {selectedFiles.map((item) => <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 border border-[#d6c8ad] bg-white px-3 py-2 text-sm">
          <span className="truncate" title={item.file.name}>{item.file.name}</span>
          <button type="button" onClick={() => setSelectedFiles((current) => removeMediaSelectionItem(current, item.id))} disabled={uploading} className="shrink-0 text-red-800 underline disabled:cursor-not-allowed disabled:opacity-60">Remove</button>
        </li>)}
      </ul>
    </div> : <p className="text-sm text-[#596052]">No files selected.</p>}
    {selection.message ? <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{selection.message}</p> : null}
    {feedback ? <p role="status" className="border border-[#c9bfa8] bg-white px-3 py-2 text-sm">{feedback}</p> : null}
    <button type="submit" disabled={!selection.canSubmit || uploading} className="bg-[#b65d40] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55">{uploading ? "Uploading..." : "Upload Images"}</button>
  </form>;
}
