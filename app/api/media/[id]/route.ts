import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isMediaBucket,
  isSafeMediaStoragePath,
  MEDIA_BUCKET,
  mediaContentDisposition,
} from "@/lib/media/private-object";

// Serve private chatten-media objects through the application origin. The row
// lookup happens under the caller's RLS context. Only then can this route use
// the service-role client — and only for the one bucket this feature owns.
//
// Bucket and MIME are database values that an editor can change, so neither is
// trusted at this privileged boundary. See private-object.ts for the checks.

type MediaRow = { bucket: unknown; storage_path: unknown; mime_type: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("media").select("bucket,storage_path,mime_type").eq("id", id).maybeSingle();
  if (error || !data) return new Response("Not found", { status: 404 });
  const media = data as MediaRow;
  if (!isMediaBucket(media.bucket) || !isSafeMediaStoragePath(media.storage_path)) return new Response("Not found", { status: 404 });

  const service = createServiceRoleSupabaseClient();
  const download = await service.storage.from(MEDIA_BUCKET).download(media.storage_path);
  if (download.error || !download.data) return new Response("Not found", { status: 404 });

  const response = mediaContentDisposition(media.mime_type);
  return new Response(download.data, {
    headers: {
      "Content-Type": response.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Disposition": response.disposition,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
