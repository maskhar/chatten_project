import type { PublicMedia } from "./types";

export function mediaUrl(media: PublicMedia | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !media) return undefined;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${media.bucket}/${media.storage_path}`;
}

export function mediaMap(rows: unknown[]) {
  return Object.fromEntries((rows as PublicMedia[]).map((row) => [row.id, row]));
}
