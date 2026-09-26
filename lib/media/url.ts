// A6: the single place that knows how a media asset is addressed.
//
// Every caller used to build
// `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
// by hand, which meant nine copies of an URL that bypassed RLS. They all go
// through app/api/media/[id]/route.ts now, which checks visibility in the
// database before streaming bytes. Addressing by id rather than bucket/path
// also stops the storage layout leaking into markup.
export function mediaHref(media: { id: string } | null | undefined) {
  return media ? `/api/media/${media.id}` : undefined;
}

export function mediaHrefById(id: string | null | undefined) {
  return id ? `/api/media/${id}` : undefined;
}
