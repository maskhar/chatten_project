"use client";

import Image from "next/image";
import { ActionForm } from "@/components/admin/action-form";
import { MediaPicker } from "@/components/admin/media-picker";
import { RowFeedback } from "@/components/admin/row-feedback";
import { RowLink } from "@/components/admin/row-link";
import { SortableList } from "@/components/admin/sortable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useRowOperation } from "@/components/admin/use-row-operation";
import {
  deleteGalleryItem,
  reorderGalleryItems,
  saveGalleryItem,
  toggleGalleryItem,
} from "@/lib/admin/gallery-actions";
import { mediaHrefById } from "@/lib/media/url";
import {
  ROW_ACTION_BORDERED,
  ROW_ACTION_DANGER,
} from "@/components/ui/control";

type Gallery = {
  id: string;
  title: string | null;
  alt_text: string;
  image_media_id: string | null;
  is_active: boolean;
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

export function GalleryManagerClient({
  items,
  media,
}: {
  items: Gallery[];
  media: Media[];
}) {
  const rowOperation = useRowOperation();
  const image = (id: string | null) =>
    mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  function toggleItem(id: string, active: boolean) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    return toggleGalleryItem(formData);
  }

  function removeItem(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    return deleteGalleryItem(formData);
  }

  const sortable = items.map((item) => {
    const imageUrl = image(item.image_media_id);
    return {
      id: item.id,
      label: item.title ?? "Gambar tanpa judul",
      detail: (
        <div className="mt-2 flex items-center gap-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.alt_text}
              width={120}
              height={80}
              className="h-16 w-24 rounded object-cover"
            />
          ) : null}
          <span className="text-xs">
            {item.is_active ? "Tampil" : "Tersembunyi"}
          </span>
        </div>
      ),
      actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
        const pending = rowOperation.isPending(item.id);
        const locked = reorderBusy || rowOperation.busy;
        return (
          <>
            <RowLink
              href={`/admin/gallery/items/${item.id}`}
              locked={locked}
              className={ROW_ACTION_BORDERED}
            >
              Edit
            </RowLink>
            <button
              type="button"
              disabled={locked}
              aria-busy={pending}
              className={ROW_ACTION_BORDERED}
              onClick={() =>
                rowOperation.run(
                  item.id,
                  () => toggleItem(item.id, !item.is_active),
                  item.is_active
                    ? "Item galeri disembunyikan."
                    : "Item galeri ditampilkan.",
                  "Status tampil item galeri gagal diperbarui.",
                )
              }
            >
              {pending ? "Memproses…" : item.is_active ? "Sembunyikan" : "Tampilkan"}
            </button>
            <button
              type="button"
              disabled={locked}
              aria-busy={pending}
              className={ROW_ACTION_DANGER}
              onClick={() => {
                if (!confirm(`Hapus ${item.title ?? "gambar ini"} dari Galeri?`)) {
                  return;
                }
                rowOperation.run(
                  item.id,
                  () => removeItem(item.id),
                  "Item galeri dihapus.",
                  "Item galeri gagal dihapus.",
                );
              }}
            >
              {pending ? "Memproses…" : "Hapus"}
            </button>
            <RowFeedback feedback={rowOperation.feedback(item.id)} />
          </>
        );
      },
    };
  });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">
            Situs
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">
            Galeri
          </h1>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Kurasi cerita visual untuk situs publik.
          </p>
        </div>
        <a
          href="#add-gallery"
          className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white"
        >
          + Tambah Gambar
        </a>
      </div>

      <div className="mt-8">
        <SortableList
          onSave={reorderGalleryItems}
          items={sortable}
          rowBusy={rowOperation.busy}
        />
      </div>

      <ActionForm
        id="add-gallery"
        action={saveGalleryItem}
        className="mt-8 max-w-xl rounded border bg-white p-5"
      >
        <h2 className="font-semibold">Tambah item galeri</h2>
        <label className="mt-3 block text-sm">
          Keterangan
          <input name="title" className={field} />
        </label>
        <label className="mt-3 block text-sm">
          Teks alt
          <input name="alt_text" className={field} />
        </label>
        <MediaPicker name="image_media_id" media={media} />
        <label className="mt-3 flex gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked />
          Tampil
        </label>
        <input type="hidden" name="status" value="published" />
        <SubmitButton
          className="mt-4 rounded bg-forest px-4 py-3 text-sm font-semibold text-white"
          pendingLabel="Menambahkan…"
        >
          Tambah ke Galeri
        </SubmitButton>
      </ActionForm>
    </section>
  );
}
