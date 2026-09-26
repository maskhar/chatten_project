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
  deleteSpace,
  reorderSpaces,
  saveSpace,
  setSpaceActive,
} from "@/lib/admin/space-actions";
import { mediaHrefById } from "@/lib/media/url";
import {
  ROW_ACTION_BORDERED,
  ROW_ACTION_DANGER,
  ROW_ACTION_PRIMARY,
} from "@/components/ui/control";

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

export function SpacesManagerClient({
  spaces,
  media,
}: {
  spaces: Space[];
  media: Media[];
}) {
  const rowOperation = useRowOperation();
  const imageUrl = (id: string | null) =>
    mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  function changeVisibility(id: string, active: boolean) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    return setSpaceActive(formData);
  }

  function removeSpace(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    return deleteSpace(formData);
  }

  const sortableItems = spaces.map((space) => ({
    id: space.id,
    label: space.name,
    detail: (
      <div className="mt-1 flex items-center gap-3">
        {imageUrl(space.image_media_id) ? (
          <Image
            src={imageUrl(space.image_media_id) as string}
            alt={space.name}
            width={80}
            height={60}
            className="h-12 w-16 rounded object-cover"
          />
        ) : (
          <div className="h-12 w-16 rounded bg-moss" />
        )}
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">/{space.slug}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-paper px-2 py-1">
              {space.status === "published" ? "Terbit" : "Draf"}
            </span>
            <span className="rounded bg-paper px-2 py-1">
              {space.is_active ? "Aktif" : "Tersembunyi"}
            </span>
          </div>
          {space.description ? (
            <p className="mt-1 line-clamp-1 text-xs text-ink">
              {space.description}
            </p>
          ) : null}
        </div>
      </div>
    ),
    actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
      const pending = rowOperation.isPending(space.id);
      const locked = reorderBusy || rowOperation.busy;
      return (
        <>
          <button
            type="button"
            disabled={locked}
            aria-busy={pending}
            className={ROW_ACTION_BORDERED}
            onClick={() =>
              rowOperation.run(
                space.id,
                () => changeVisibility(space.id, !space.is_active),
                space.is_active ? "Ruang disembunyikan." : "Ruang ditampilkan.",
                "Status ruang gagal diperbarui.",
              )
            }
          >
            {pending ? "Menyimpan…" : space.is_active ? "Sembunyikan" : "Tampilkan"}
          </button>
          <RowLink
            href={`/admin/spaces/items/${space.id}`}
            locked={locked}
            className={ROW_ACTION_PRIMARY}
          >
            Edit
          </RowLink>
          <button
            type="button"
            disabled={locked}
            aria-busy={pending}
            className={ROW_ACTION_DANGER}
            onClick={() => {
              if (
                !confirm(
                  `Hapus “${space.name}”? Data Ruang dihapus, tetapi gambar di Pustaka Media tetap disimpan.`,
                )
              ) {
                return;
              }
              rowOperation.run(
                space.id,
                () => removeSpace(space.id),
                "Ruang dihapus.",
                "Ruang gagal dihapus.",
              );
            }}
          >
            {pending ? "Menghapus…" : "Hapus"}
          </button>
          <RowFeedback feedback={rowOperation.feedback(space.id)} />
        </>
      );
    },
  }));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">
            Situs
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">
            Ruang
          </h1>
          <p className="mt-3 max-w-2xl text-ink">
            Kelola ruang yang bisa ditemukan dan dipakai tamu di Chatten.
          </p>
        </div>
        <a
          href="#add-space"
          className="rounded bg-terracotta px-5 py-3 text-sm font-semibold text-white"
        >
          + Tambah Ruang
        </a>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {spaces.length ? (
            <SortableList
              items={sortableItems}
              onSave={reorderSpaces}
              rowBusy={rowOperation.busy}
            />
          ) : (
            <div className="rounded border border-dashed border-line bg-white p-10 text-center">
              <p className="font-serif text-2xl sm:text-3xl">
                Belum ada ruang yang ditambahkan.
              </p>
              <a
                href="#add-space"
                className="mt-5 inline-block rounded bg-terracotta px-5 py-3 text-sm font-semibold text-white"
              >
                Tambah Ruang
              </a>
            </div>
          )}
        </div>

        <ActionForm
          id="add-space"
          action={saveSpace}
          className="h-fit grid gap-4 rounded border border-line bg-sand p-6"
        >
          <h2 className="font-serif text-2xl sm:text-3xl">Tambah Ruang</h2>
          <label className="text-sm font-semibold">
            Nama ruang
            <input name="name" required className={field} />
          </label>
          <label className="text-sm font-semibold">
            Slug
            <input name="slug" className={field} />
            <span className="mt-1 block text-xs font-normal text-ink-muted">
              Kosongkan untuk dibuat otomatis dari nama.
            </span>
          </label>
          <label className="text-sm font-semibold">
            Deskripsi
            <textarea name="description" rows={5} className={field} />
          </label>
          <MediaPicker name="image_media_id" media={media} />
          <label className="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked />
            Aktif
          </label>
          <label className="text-sm font-semibold">
            Status
            <select name="status" defaultValue="draft" className={field}>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </label>
          <SubmitButton
            className="rounded bg-forest px-5 py-3 text-sm font-semibold text-white"
            pendingLabel="Menyimpan…"
          >
            Buat Ruang
          </SubmitButton>
        </ActionForm>
      </div>
    </section>
  );
}
