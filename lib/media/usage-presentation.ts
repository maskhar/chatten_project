import type { MediaUsageReference } from "./usage";

const unusedMessage = "This image is not currently used anywhere.";

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
    summary: count ? `Used in ${count} ${count === 1 ? "place" : "places"}` : null,
    emptyMessage: count ? null : unusedMessage,
    references,
  };
}
