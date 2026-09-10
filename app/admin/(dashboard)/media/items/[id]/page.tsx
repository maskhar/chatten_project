import Link from "next/link";
import { notFound } from "next/navigation";
import { saveMediaDetails } from "@/lib/admin/media-actions";
import { buildMediaUsagePresentation } from "@/lib/media/usage-presentation";
import { loadMediaUsageMap } from "@/lib/media/usage-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MediaItem = {
  id: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  category: string | null;
  tags: string[] | null;
  source_type: string | null;
  source_reference: string | null;
  attribution: string | null;
  rights_status: string;
};

export default async function MediaDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [itemResult, usageMap] = await Promise.all([
    supabase.from("media").select("id,title,alt_text,caption,category,tags,source_type,source_reference,attribution,rights_status").eq("id", id).maybeSingle(),
    loadMediaUsageMap(),
  ]);
  if (itemResult.error) throw new Error("Unable to load Media item.");
  const item = itemResult.data as MediaItem | null;
  if (!item) notFound();
  const usage = buildMediaUsagePresentation(usageMap.get(item.id) ?? []);

  return <section>
    <Link href="/admin/media">Back to Media</Link>
    <h1>Edit media</h1>
    <form action={saveMediaDetails}>
      <input type="hidden" name="id" value={item.id} />
      <label>Title<input name="title" defaultValue={item.title ?? ""} /></label>
      <label>Alt text<input name="alt_text" defaultValue={item.alt_text ?? ""} /></label>
      <label>Caption<textarea name="caption" defaultValue={item.caption ?? ""} /></label>
      <label>Category<input name="category" defaultValue={item.category ?? ""} /></label>
      <label>Tags<input name="tags" defaultValue={item.tags?.join(", ") ?? ""} /></label>
      <label>Source type<input name="source_type" defaultValue={item.source_type ?? ""} /></label>
      <label>Source reference<input name="source_reference" defaultValue={item.source_reference ?? ""} /></label>
      <label>Attribution<input name="attribution" defaultValue={item.attribution ?? ""} /></label>
      <label>Rights<select name="rights_status" defaultValue={item.rights_status}><option value="unknown">Needs Review</option><option value="approved">Approved</option><option value="restricted">Restricted</option></select></label>
      <button>Save changes</button>
    </form>
    <section className="mt-8 max-w-2xl border border-[#c9bfa8] bg-white p-5" aria-labelledby="media-used-in-heading">
      <h2 id="media-used-in-heading" className="font-serif text-3xl">Used In</h2>
      {usage.summary ? <p className="mt-2 text-sm text-[#596052]">{usage.summary}</p> : null}
      {usage.emptyMessage ? <p className="mt-3 text-sm text-[#596052]">{usage.emptyMessage}</p> : null}
      {usage.count ? <ul className="mt-4 grid gap-2" aria-label={usage.summary ?? undefined}>
        {usage.references.map((reference, index) => <li className="min-w-0 border-t border-[#e3dbc9] pt-2" key={reference.resource + "-" + reference.mediaId + "-" + index}>
          {reference.href ? <Link href={reference.href} className="block break-words underline">{reference.label} — {reference.title}</Link> : <span className="block break-words">{reference.label} — {reference.title}</span>}
        </li>)}
      </ul> : null}
    </section>
  </section>;
}
