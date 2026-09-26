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
  deleteExperience,
  reorderExperiences,
  saveExperience,
  setExperienceActive,
} from "@/lib/admin/experience-actions";
import { mediaHrefById } from "@/lib/media/url";
import {
  ROW_ACTION_BORDERED,
  ROW_ACTION_DANGER,
  ROW_ACTION_PRIMARY,
} from "@/components/ui/control";

type Experience = {
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

export function ExperiencesManagerClient({
  experiences,
  media,
}: {
  experiences: Experience[];
  media: Media[];
}) {
  const rowOperation = useRowOperation();
  const image = (id: string | null) =>
    mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  function changeVisibility(id: string, active: boolean) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    return setExperienceActive(formData);
  }

  function removeExperience(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    return deleteExperience(formData);
  }

  const sortableItems = experiences.map((experience) => {
    const imageUrl = image(experience.image_media_id);
    return {
      id: experience.id,
      label: experience.name,
      detail: (
        <div className="mt-1 flex items-center gap-2">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={experience.name}
              width={80}
              height={60}
              className="h-12 w-16 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-12 w-16 shrink-0 rounded bg-moss" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">/{experience.slug}</p>
            <div className="mt-1 flex gap-2">
              <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-leaf-ink">
                {experience.status === "published" ? "Terbit" : "Draf"}
              </span>
              <span className="rounded bg-paper px-2 py-0.5 text-xs font-semibold text-ink">
                {experience.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>
      ),
      actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
        const pending = rowOperation.isPending(experience.id);
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
                  experience.id,
                  () => changeVisibility(experience.id, !experience.is_active),
                  experience.is_active
                    ? "Pengalaman disembunyikan."
                    : "Pengalaman ditampilkan.",
                  "Status tampil pengalaman gagal diperbarui.",
                )
              }
            >
              {pending
                ? "Menyimpan…"
                : experience.is_active
                  ? "Sembunyikan"
                  : "Tampilkan"}
            </button>
            <RowLink
              href={`/admin/experiences/items/${experience.id}`}
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
                if (!confirm("Hapus pengalaman ini? Berkas media terkait tidak ikut dihapus.")) {
                  return;
                }
                rowOperation.run(
                  experience.id,
                  () => removeExperience(experience.id),
                  "Pengalaman dihapus.",
                  "Pengalaman gagal dihapus.",
                );
              }}
            >
              {pending ? "Menghapus…" : "Hapus"}
            </button>
            <RowFeedback feedback={rowOperation.feedback(experience.id)} />
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
            Pengalaman
          </h1>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Kelola pengalaman yang bisa ditemukan pengunjung di Chatten.
          </p>
        </div>
        <a
          href="#add-experience"
          className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white"
        >
          + Tambah Pengalaman
        </a>
      </div>

      {experiences.length === 0 ? (
        <div className="mt-10 rounded border border-mist bg-white p-12 text-center">
          <p className="text-ink-muted">Belum ada pengalaman yang ditambahkan.</p>
          <a
            href="#add-experience"
            className="mt-4 inline-block rounded bg-forest px-4 py-2 text-sm font-semibold text-white"
          >
            Tambah Pengalaman
          </a>
        </div>
      ) : (
        <div className="mt-8">
          <SortableList
            items={sortableItems}
            onSave={reorderExperiences}
            rowBusy={rowOperation.busy}
          />
        </div>
      )}

      <ActionForm
        id="add-experience"
        action={saveExperience}
        className="mt-8 max-w-2xl rounded border border-line bg-sand p-6"
      >
        <h2 className="font-serif text-2xl sm:text-3xl">Tambah Pengalaman</h2>
        <label className="mt-4 block text-sm font-semibold">
          Nama pengalaman
          <input name="name" required className={field} />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Slug
          <input name="slug" required className={field} />
          <span className="mt-1 block text-xs text-ink-muted">
            Pengenal ramah-URL (mis. morning-coffee)
          </span>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Deskripsi
          <textarea name="description" required rows={4} className={field} />
        </label>
        <div className="mt-4">
          <MediaPicker name="image_media_id" media={media} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked />
            Aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            Status:
            <select name="status" className="rounded border px-2 py-1 text-sm">
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </label>
        </div>
        <SubmitButton
          className="mt-6 w-full rounded bg-terracotta px-4 py-3 text-sm font-semibold text-white hover:bg-clay"
          pendingLabel="Menyimpan…"
        >
          Buat Pengalaman
        </SubmitButton>
      </ActionForm>
    </section>
  );
}
