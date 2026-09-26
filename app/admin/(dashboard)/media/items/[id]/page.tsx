import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/submit-button";
import { saveMediaDetails } from "@/lib/admin/media-actions";
import { ActionForm } from "@/components/admin/action-form";
import { focalObjectPosition } from "@/lib/media/focal-point";
import { mediaHrefById } from "@/lib/media/url";
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
  focal_x: number | null;
  focal_y: number | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
};

const field = "mt-1 block w-full rounded border border-line bg-white px-3 py-2 text-sm";
const labelText = "block text-sm font-semibold";

function fileSizeLabel(bytes: number | null) {
  if (!bytes) return "Ukuran tidak diketahui";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [itemResult, usageMap] = await Promise.all([
    supabase.from("media").select("id,title,alt_text,caption,category,tags,focal_x,focal_y,original_filename,mime_type,file_size,width,height").eq("id", id).maybeSingle(),
    loadMediaUsageMap(),
  ]);
  if (itemResult.error) throw new Error("Item media tidak dapat dimuat.");
  const item = itemResult.data as MediaItem | null;
  if (!item) notFound();
  const usage = buildMediaUsagePresentation(usageMap.get(item.id) ?? []);
  const href = mediaHrefById(item.id);

  return (
    <section>
      <Link href="/admin/media" className="text-sm text-ink-muted">← Kembali ke Pustaka Media</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-clay">Media</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">{item.title ?? item.original_filename ?? "Gambar tanpa judul"}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside className="h-fit rounded border border-mist bg-white p-4">
          {/* A29: the screen had no preview at all, so alt text had to be
              judged from a filename. The preview honours the focal point
              below, which makes the effect of changing it visible immediately
              after a save. */}
          {href ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded bg-mist">
              <Image src={href} alt={item.alt_text ?? item.title ?? "Pratinjau media"} fill sizes="320px" className="object-cover" style={{ objectPosition: focalObjectPosition(item) }} />
            </div>
          ) : null}
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Berkas</dt><dd className="min-w-0 break-words text-right">{item.original_filename ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Tipe</dt><dd>{item.mime_type ?? "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Ukuran</dt><dd>{fileSizeLabel(item.file_size)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Dimensi</dt><dd>{item.width && item.height ? `${item.width} × ${item.height}` : "—"}</dd></div>
          </dl>
        </aside>

        <ActionForm action={saveMediaDetails} className="grid max-w-2xl gap-5 rounded border border-line bg-sand p-6">
          <input type="hidden" name="id" value={item.id} />
          <label className={labelText}>Judul<input name="title" defaultValue={item.title ?? ""} className={field} /></label>
          <label className={labelText}>Teks alt <span className="font-normal text-ink-muted">— opsional</span><input name="alt_text" defaultValue={item.alt_text ?? ""} className={field} /><span className="mt-1 block text-xs font-normal text-ink-muted">Menjelaskan gambar untuk pembaca layar dan mesin pencari. Isi satu kalimat bila ada; gambar tetap tampil tanpa itu.</span></label>
          <label className={labelText}>Keterangan<textarea name="caption" rows={3} defaultValue={item.caption ?? ""} className={field} /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelText}>Kategori<input name="category" defaultValue={item.category ?? ""} className={field} /></label>
            <label className={labelText}>Tagar<input name="tags" defaultValue={item.tags?.join(", ") ?? ""} className={field} /><span className="mt-1 block text-xs font-normal text-ink-muted">Pisahkan dengan koma.</span></label>
          </div>

          <fieldset className="grid gap-3 rounded border border-line bg-white/60 p-4">
            <legend className="px-1 text-sm font-semibold">Titik fokus</legend>
            {/* A28: these columns have existed since the rights-metadata
                migration but nothing wrote them, so every crop fell back to
                centre and a subject near an edge was cut off. */}
            <p className="text-xs text-ink-muted">Bagian gambar yang harus tetap terlihat saat dipotong. Nilai 0 berarti kiri/atas, 1 berarti kanan/bawah. Kosongkan keduanya agar tetap di tengah.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelText}>Horizontal<input name="focal_x" type="number" min={0} max={1} step={0.01} defaultValue={item.focal_x ?? ""} className={field} /></label>
              <label className={labelText}>Vertikal<input name="focal_y" type="number" min={0} max={1} step={0.01} defaultValue={item.focal_y ?? ""} className={field} /></label>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <SubmitButton className="rounded bg-forest px-6 py-3 text-sm font-semibold text-white">Simpan perubahan</SubmitButton>
            <Link href="/admin/media" className="rounded border border-forest px-6 py-3 text-sm font-semibold">Batal</Link>
          </div>
        </ActionForm>
      </div>

      <section className="mt-8 max-w-2xl rounded border border-line bg-white p-5" aria-labelledby="media-used-in-heading">
        <h2 id="media-used-in-heading" className="font-serif text-2xl sm:text-3xl">Digunakan di</h2>
        {usage.summary ? <p className="mt-2 text-sm text-ink">{usage.summary}</p> : null}
        {usage.emptyMessage ? <p className="mt-3 text-sm text-ink">{usage.emptyMessage}</p> : null}
        {usage.count ? (
          <ul className="mt-4 grid gap-2" aria-label={usage.summary ?? undefined}>
            {usage.references.map((reference, index) => (
              <li className="min-w-0 border-t border-sand pt-2" key={reference.resource + "-" + reference.mediaId + "-" + index}>
                {reference.href ? <Link href={reference.href} className="block break-words underline">{reference.label} — {reference.title}</Link> : <span className="block break-words">{reference.label} — {reference.title}</span>}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
