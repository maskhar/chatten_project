import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// A6 audit remediation: serve chatten-media through the application origin
// instead of Supabase's /storage/v1/object/public/** route.
//
// The public storage route is the whole problem: when a bucket has
// public = true, storage-api answers it without evaluating RLS at all, so
// tightening the storage.objects policy (20260921000200) had no effect on it.
// Anyone who could guess or scrape a storage path read the bytes, including
// media still sitting at rights_status = 'unknown' or 'restricted'.
//
// This route puts the decision back in the database. The row lookup uses the
// request's own RLS-bound session client, so visibility is decided by the
// existing policies and not re-implemented here:
//   - anonymous visitors match public_media (rights_status = 'approved'),
//   - signed-in CMS members additionally match cms_manage and can preview
//     unapproved assets in the Media Library.
// A row that no policy exposes simply comes back empty and this returns 404,
// which is also the right answer for a media id that does not exist: it does
// not confirm the asset is there.
//
// The bytes themselves are read with the service-role client because the
// bucket becomes private at the end of this change and the anon key can no
// longer download from it. That client never reaches the browser
// (lib/supabase/service-role.ts is "server-only") and is used here only after
// the RLS check above has already allowed the row.

type MediaRow = { bucket: string; storage_path: string; mime_type: string | null; rights_status: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("media").select("bucket,storage_path,mime_type,rights_status").eq("id", id).maybeSingle();
  if (error || !data) return new Response("Not found", { status: 404 });
  const media = data as MediaRow;

  const service = createServiceRoleSupabaseClient();
  const download = await service.storage.from(media.bucket).download(media.storage_path);
  if (download.error || !download.data) return new Response("Not found", { status: 404 });

  // Approved media is what the public site renders, so it may sit in shared
  // caches. Anything else was only visible because a CMS session allowed it;
  // caching that would hand the bytes to the next anonymous request for the
  // same URL, so it is kept out of every cache and marked Vary: Cookie.
  const approved = media.rights_status === "approved";
  return new Response(download.data, {
    headers: {
      "Content-Type": media.mime_type ?? download.data.type ?? "application/octet-stream",
      "Cache-Control": approved ? "public, max-age=300, stale-while-revalidate=86400" : "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
