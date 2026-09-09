import type { Media } from "./types";
export function mediaUrl(media: Media | undefined, supabaseUrl: string | undefined) { if (!media || !supabaseUrl) return undefined; return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${media.bucket}/${media.storage_path}`; }
