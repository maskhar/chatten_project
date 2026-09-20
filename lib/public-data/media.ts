import type { PublicMedia } from "./types";
import { mediaHref } from "@/lib/media/url";

// A6: addressed by id on this origin, served by app/api/media/[id]/route.ts.
export function mediaUrl(media: PublicMedia | undefined) {
  return mediaHref(media);
}

export function mediaMap(rows: unknown[]) {
  return Object.fromEntries((rows as PublicMedia[]).map((row) => [row.id, row]));
}
