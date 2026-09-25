"use client";

import Image from "next/image";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/media-picker";
import { deleteSpace, reorderSpaces, saveSpace, setSpaceActive } from "@/lib/admin/space-actions";
import { SortableList } from "@/components/admin/sortable-list";
import { mediaHrefById } from "@/lib/media/url";
import { SubmitButton } from "@/components/admin/submit-button";
import { ROW_ACTION_BORDERED, ROW_ACTION_DANGER, ROW_ACTION_PRIMARY } from "@/components/ui/control";

type Space = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_media_id: string | null;
  is_active: boolean;
  status: string;
};

type Media = {
  id: string;
  title: string | null;
  alt_text: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  bucket: string;
  storage_path: string;
};

const field = "mt-1 w-full rounded border px-3 py-2";

export function SpacesManagerClient({ spaces, media }: { spaces: Space[]; media: Media[] }) {
  const imageUrl = (id: string | null) => mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  const handleVisibility = async (id: string, active: boolean) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    await setSpaceActive(formData);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus “${name}”? Data Ruang dihapus, tetapi gambar di Pustaka Media tetap disimpan.`)) return;
    const formData = new FormData();
    formData.append("id", id);
    await deleteSpace(formData);
  };

  const sortableItems = spaces.map((space) => ({
    id: space.id,
    label: space.name,
    detail: (
      <div className="mt-1 flex items-center gap-3">
        {imageUrl(space.image_media_id) ? <Image src={imageUrl(space.image_media_id) as string} alt={space.name} width={80} height={60} className="h-12 w-16 rounded object-cover" /> : <div className="h-12 w-16 rounded bg-moss" />}
        <div className="min-w-0"><p className="text-xs text-ink-muted">/{space.slug}</p><div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded bg-paper px-2 py-1">{space.status === "published" ? "Terbit" : "Draf"}</span><span className="rounded bg-paper px-2 py-1">{space.is_active ? "Aktif" : "Tersembunyi"}</span></div>{space.description ? <p className="mt-1 line-clamp-1 text-xs text-ink">{space.description}</p> : null}</div>
      </div>
    ),
    actions: (
      <>
        <button type="button" onClick={() => handleVisibility(space.id, !space.is_active)} className={ROW_ACTION_BORDERED}>{space.is_active ? "Sembunyikan" : "Tampilkan"}</button>
        <Link href={`/admin/spaces/items/${space.id}`} className={ROW_ACTION_PRIMARY}>Edit</Link>
        <button type="button" onClick={() => handleDelete(space.id, space.name)} className={ROW_ACTION_DANGER}>Hapus</button>
      </>
    ),
  }));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">Situs</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">Ruang</h1>
          <p className="mt-3 max-w-2xl text-ink">Kelola ruang yang bisa ditemukan dan dipakai tamu di Chatten.</p>
        </div>
        <a href="#add-space" className="rounded bg-terracotta px-5 py-3 text-sm font-semibold text-white">+ Tambah Ruang</a>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {spaces.length ? <SortableList items={sortableItems} onSave={reorderSpaces} /> : (
            <div className="rounded border border-dashed border-line bg-white p-10 text-center">
              <p className="font-serif text-2xl sm:text-3xl">Belum ada ruang yang ditambahkan.</p>
              <a href="#add-space" className="mt-5 inline-block rounded bg-terracotta px-5 py-3 text-sm font-semibold text-white">Tambah Ruang</a>
            </div>
          )}
        </div>

        <form id="add-space" action={saveSpace} className="h-fit grid gap-4 rounded border border-line bg-sand p-6">
          <h2 className="font-serif text-2xl sm:text-3xl">Tambah Ruang</h2>
          <label className="text-sm font-semibold">Nama ruang<input name="name" required className={field} /></label>
          <label className="text-sm font-semibold">Slug<input name="slug" className={field} /><span className="mt-1 block text-xs font-normal text-ink-muted">Kosongkan untuk dibuat otomatis dari nama.</span></label>
          <label className="text-sm font-semibold">Deskripsi<textarea name="description" rows={5} className={field} /></label>
          <MediaPicker name="image_media_id" media={media} />
          <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked />Aktif</label>
          <label className="text-sm font-semibold">Status<select name="status" defaultValue="draft" className={field}><option value="draft">Draf</option><option value="published">Terbit</option></select></label>
          <SubmitButton className="rounded bg-forest px-5 py-3 text-sm font-semibold text-white" pendingLabel="Menyimpan…">Buat Ruang</SubmitButton>
        </form>
      </div>
    </section>
  );
}
