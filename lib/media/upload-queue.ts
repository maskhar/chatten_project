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

export function createQueueItem(id: string, file: File): UploadQueueItem {
  return { id, file, status: "ready" };
}

export function setQueueItemsUploading(items: readonly UploadQueueItem[]): UploadQueueItem[] {
  return items.map((item) => ({ ...item, status: "uploading" as const }));
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
  const complete = items.filter((item) => item.status === "complete").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const uploadedText = `${complete} gambar berhasil diunggah.`;
  if (failed === 0) return uploadedText;
  return `${uploadedText} ${failed} berkas gagal.`;
}
