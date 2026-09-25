"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { SortableList } from "@/components/admin/sortable-list";
import { saveExperience, reorderExperiences, setExperienceActive, deleteExperience } from "@/lib/admin/experience-actions";
import { mediaHrefById } from "@/lib/media/url";
import { SubmitButton } from "@/components/admin/submit-button";
import { ROW_ACTION_BORDERED, ROW_ACTION_DANGER, ROW_ACTION_PRIMARY } from "@/components/ui/control";

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
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const image = (id: string | null) => mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  const handleVisibility = async (id: string, active: boolean) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    await setExperienceActive(formData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengalaman ini? Berkas media terkait tidak ikut dihapus.")) {
      return;
    }
    
    setDeleting(id);
    try {
      const formData = new FormData();
      formData.append("id", id);
      await deleteExperience(formData);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Tidak dapat menghapus pengalaman.");
      setDeleting(null);
    }
  };

  const sortableItems = experiences.map((experience) => {
    const imgUrl = image(experience.image_media_id);
    
    return {
      id: experience.id,
      label: experience.name,
      detail: (
        <div className="mt-1 flex items-center gap-2">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={experience.name}
              width={80}
              height={60}
              className="h-12 w-16 flex-shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-12 w-16 flex-shrink-0 rounded bg-moss" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">/{experience.slug}</p>
            <div className="mt-1 flex gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  experience.status === "published"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {experience.status === "published" ? "Terbit" : "Draf"}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  experience.is_active
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {experience.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>
      ),
      actions: (
        <>
          <button
            type="button"
            onClick={() => handleVisibility(experience.id, !experience.is_active)}
            className={ROW_ACTION_BORDERED}
          >
            {experience.is_active ? "Sembunyikan" : "Tampilkan"}
          </button>
          <Link
            href={`/admin/experiences/items/${experience.id}`}
            className={ROW_ACTION_PRIMARY}
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(experience.id)}
            disabled={deleting === experience.id}
            className={`${ROW_ACTION_DANGER} disabled:opacity-50`}
          >
            {deleting === experience.id ? "Menghapus…" : "Hapus"}
          </button>
        </>
      ),
    };
  });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">
            Situs
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">Pengalaman</h1>
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
          />
        </div>
      )}

      <form
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

        <SubmitButton className="mt-6 w-full rounded bg-terracotta px-4 py-3 text-sm font-semibold text-white hover:bg-clay" pendingLabel="Menyimpan…">
          Buat Pengalaman
        </SubmitButton>
      </form>
    </section>
  );
}
