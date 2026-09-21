import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// A6 audit remediation: serve chatten-media through the application origin
// instead of Supabase's /storage/v1/object/public/** route.
//
// The bucket is private, so the only way in is this route. A storage path is
// never exposed to the browser and cannot be guessed into a working URL; the
// id in this address is the whole public surface. An id that resolves to no
// row returns 404, which is also the answer for one that does not exist, so
// probing tells an attacker nothing.
//
// 20260921000500 removed the rights-approval gate, so every media row is
// publicly readable and this route no longer has a visibility decision to
// make — it resolves the row under RLS and streams the bytes.
//
// The bytes are read with the service-role client because a private bucket
// will not answer the anon key. That client never reaches the browser
// (lib/supabase/service-role.ts is "server-only") and is reached here only
// after the row lookup above has succeeded.

type MediaRow = { bucket: string; storage_path: string; mime_type: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("media").select("bucket,storage_path,mime_type").eq("id", id).maybeSingle();
  if (error || !data) return new Response("Not found", { status: 404 });
  const media = data as MediaRow;

  const service = createServiceRoleSupabaseClient();
  const download = await service.storage.from(media.bucket).download(media.storage_path);
  if (download.error || !download.data) return new Response("Not found", { status: 404 });

  // Every media row is now public, so the same bytes go to every caller and
  // the response is safe in a shared cache.
  return new Response(download.data, {
    headers: {
      "Content-Type": media.mime_type ?? download.data.type ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
