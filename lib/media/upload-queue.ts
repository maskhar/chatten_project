export type UploadQueueItemStatus = "ready" | "uploading" | "complete" | "failed";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: UploadQueueItemStatus;
  code?: string;
  message?: string;
  mediaId?: string;
};

export function createQueueItem(id: string, file: File): UploadQueueItem {
  return { id, file, status: "ready" };
}

export function setQueueItemsUploading(items: readonly UploadQueueItem[]): UploadQueueItem[] {
  return items.map((item) => ({ ...item, status: "uploading" as const }));
}

export function applyUploadResults(
  items: readonly UploadQueueItem[],
  results: ReadonlyArray<{ ok: boolean; filename: string; mediaId?: string; code?: string; message?: string }>,
): UploadQueueItem[] {
  return items.map((item, index) => {
    const result = results[index];
    if (!result) return item;
    if (result.ok) {
      return { ...item, status: "complete" as const, mediaId: result.mediaId };
    }
    return { ...item, status: "failed" as const, code: result.code, message: result.message };
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
  if (failed === 0) {
    return complete === 1 ? "1 image uploaded." : `${complete} images uploaded.`;
  }
  const uploadedText = complete === 1 ? "1 image uploaded." : `${complete} images uploaded.`;
  const failedText = failed === 1 ? " 1 file failed." : ` ${failed} files failed.`;
  return uploadedText + failedText;
}
