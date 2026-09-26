import type { Media } from "./types";
import { mediaHref } from "@/lib/media/url";
// A6: no longer takes the Supabase origin. Media is addressed by id on the
// application's own origin and served by app/api/media/[id]/route.ts, which
// resolves the row under RLS before streaming bytes from the private bucket.
export function mediaUrl(media: Media | undefined) { return mediaHref(media); }
