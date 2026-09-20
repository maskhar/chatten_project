import type { Media } from "./types";
import { mediaHref } from "@/lib/media/url";
// A6: no longer takes the Supabase origin. Media is addressed by id on the
// application's own origin and served by app/api/media/[id]/route.ts, which
// checks rights_status under RLS before streaming bytes.
export function mediaUrl(media: Media | undefined) { return mediaHref(media); }
