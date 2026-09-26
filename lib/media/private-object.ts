// The chatten-media bucket is private (20260921000400) and app/api/media/[id]
// is the application's media delivery path. These helpers decide what that route is
// allowed to hand to the service-role client and what it is allowed to say
// about the bytes it returns.
//
// Deliberately free of credentials and of "server-only": it is pure decision
// logic so the boundary can be exercised directly by tests. The service-role
// client stays in the route, next to lib/supabase/service-role.ts which is
// itself "server-only".

// The only bucket this application owns. The route must compare a stored row
// against this constant instead of forwarding the row's own `bucket` value:
// `bucket` is an editor-writable column, and forwarding it would let a CMS
// editor aim a service-role download at any bucket in the project — including
// buckets whose objects RLS would never have shown them.
export const MEDIA_BUCKET = "chatten-media";

// Upload only ever stores these four (lib/media/upload-core.ts validates the
// bytes themselves before writing), so anything else in mime_type is either a
// row written outside the upload path or a value edited afterwards.
const INLINE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function isMediaBucket(bucket: unknown) {
  return bucket === MEDIA_BUCKET;
}

// storage_path is stored, not derived, at read time. Supabase resolves a path
// against the bucket root, so a stored "../" segment or a leading slash is a
// traversal attempt rather than a legitimate object name.
//
// The character set is an allowlist, not a blocklist, because the path is spliced
// into a Storage URL: a stored "object.png#x" or "object.png?x" is truncated at
// the "#" or "?" and silently resolves to a *different* object than the row
// names — an alias that reads bytes the row does not point at. Upload only ever
// writes "operator/<sha>-<uuid>-<stem>.<ext>", whose stem is already reduced to
// [A-Za-z0-9_-], so nothing legitimate needs a character outside this set.
const MEDIA_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function isSafeMediaStoragePath(path: unknown): path is string {
  if (typeof path !== "string" || path === "" || path.length > 512) return false;
  return path
    .split("/")
    .every((segment) => segment !== "." && segment !== ".." && MEDIA_PATH_SEGMENT.test(segment));
}

// The stored mime_type is never echoed back verbatim. An operator-supplied
// "text/html" served inline would run as a document on the application's own
// origin — same-origin to the CMS session cookie. Allowlisted image types are
// served inline as before; everything else is downgraded to an opaque
// attachment, which is still viewable but cannot be scripted.
export function mediaContentDisposition(storedMimeType: unknown) {
  const mimeType = typeof storedMimeType === "string" ? storedMimeType.trim().toLowerCase() : "";
  if (INLINE_MEDIA_TYPES.has(mimeType)) return { contentType: mimeType, disposition: "inline" as const };
  return { contentType: "application/octet-stream", disposition: "attachment" as const };
}
