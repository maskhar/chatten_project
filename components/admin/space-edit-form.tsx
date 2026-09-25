"use client";

import Image from "next/image";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveSpace } from "@/lib/admin/space-actions";
import { ActionForm } from "@/components/admin/action-form";
import { mediaHrefById } from "@/lib/media/url";
import { SubmitButton } from "@/components/admin/submit-button";

type Space = { id: string; name: string; slug: string; description: string | null; image_media_id: string | null; is_active: boolean; status: string };
type Media = { id: string; title: string | null; alt_text: string | null; category: string | null; width: number | null; height: number | null; bucket: string; storage_path: string };
const field = "mt-1 w-full rounded border px-3 py-2";

export function SpaceEditForm({ space, media }: { space: Space; media: Media[] }) {
  const current = media.find((item) => item.id === space.image_media_id);
  const image = mediaHrefById(current?.id) ?? null;

  return (
    <section>
      <Link href="/admin/spaces" className="text-sm text-ink-muted hover:text-forest">← Kembali ke Ruang</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-clay">Edit Ruang</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">{space.name}</h1>
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ActionForm action={saveSpace} className="grid gap-6">
          <input type="hidden" name="id" value={space.id} />
          <label className="text-sm font-semibold">Nama ruang<input name="name" required defaultValue={space.name} className={field} /></label>
          <label className="text-sm font-semibold">Slug<input name="slug" required defaultValue={space.slug} className={field} /></label>
          <label className="text-sm font-semibold">Deskripsi<textarea name="description" rows={6} defaultValue={space.description ?? ""} className={field} /></label>
          <MediaPicker name="image_media_id" value={space.image_media_id ?? undefined} media={media} />
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked={space.is_active} />Aktif</label>
            <label className="flex items-center gap-2 text-sm">Status<select name="status" defaultValue={space.status} className="rounded border px-2 py-1"><option value="draft">Draf</option><option value="published">Terbit</option></select></label>
          </div>
          <div className="flex flex-wrap gap-3"><SubmitButton className="rounded bg-forest px-6 py-3 text-sm font-semibold text-white">Simpan perubahan</SubmitButton><Link href="/admin/spaces" className="rounded border border-forest px-6 py-3 text-sm font-semibold">Batal</Link></div>
        </ActionForm>
        {image ? <aside className="h-fit rounded border bg-white p-4"><p className="text-sm font-semibold">Gambar saat ini</p><Image src={image} alt={space.name} width={320} height={240} className="mt-3 w-full rounded object-cover" /></aside> : null}
      </div>
    </section>
  );
}
