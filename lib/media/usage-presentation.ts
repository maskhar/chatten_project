import type { MediaUsageReference } from "./usage";

const unusedMessage = "Gambar ini belum dipakai di mana pun.";

export type MediaUsagePresentation = {
  count: number;
  summary: string | null;
  emptyMessage: string | null;
  references: readonly MediaUsageReference[];
};

export function buildMediaUsagePresentation(references: readonly MediaUsageReference[]): MediaUsagePresentation {
  const count = references.length;
  return {
    count,
    // Indonesian has no plural inflection here, so one phrase covers both counts.
    summary: count ? `Dipakai di ${count} tempat` : null,
    emptyMessage: count ? null : unusedMessage,
    references,
  };
}
