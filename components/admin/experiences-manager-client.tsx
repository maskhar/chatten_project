"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { SortableList } from "@/components/admin/sortable-list";
import { saveExperience, reorderExperiences, setExperienceActive, deleteExperience } from "@/lib/admin/experience-actions";
import { mediaHrefById } from "@/lib/media/url";

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
  rights_status: string;
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
    if (!confirm("Delete this experience? The associated media file will not be deleted.")) {
      return;
    }
    
    setDeleting(id);
    try {
      const formData = new FormData();
      formData.append("id", id);
      await deleteExperience(formData);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete experience.");
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
            <div className="h-12 w-16 flex-shrink-0 rounded bg-[#405542]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#657064]">/{experience.slug}</p>
            <div className="mt-1 flex gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  experience.status === "published"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {experience.status}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  experience.is_active
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {experience.is_active ? "Active" : "Inactive"}
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
            className="rounded border border-[#768075] px-2 py-1 text-xs font-semibold text-[#768075] hover:bg-[#768075] hover:text-white"
          >
            {experience.is_active ? "Hide" : "Show"}
          </button>
          <Link
            href={`/admin/experiences/items/${experience.id}`}
            className="rounded border border-[#1f3426] px-2 py-1 text-xs font-semibold text-[#1f3426] hover:bg-[#1f3426] hover:text-white"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(experience.id)}
            disabled={deleting === experience.id}
            className="rounded border border-[#b65d40] px-2 py-1 text-xs font-semibold text-[#b65d40] hover:bg-[#b65d40] hover:text-white disabled:opacity-50"
          >
            {deleting === experience.id ? "Deleting..." : "Delete"}
          </button>
        </>
      ),
    };
  });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b5a42]">
            Website
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl">Experiences</h1>
          <p className="mt-3 max-w-2xl text-[#657064]">
            Manage experiences visitors can discover at Chatten.
          </p>
        </div>
        <a
          href="#add-experience"
          className="rounded bg-[#1f3426] px-4 py-2 text-sm font-semibold text-white"
        >
          + Add Experience
        </a>
      </div>

      {experiences.length === 0 ? (
        <div className="mt-10 rounded border border-[#dde0d7] bg-white p-12 text-center">
          <p className="text-[#657064]">No experiences have been added yet.</p>
          <a
            href="#add-experience"
            className="mt-4 inline-block rounded bg-[#1f3426] px-4 py-2 text-sm font-semibold text-white"
          >
            Add Experience
          </a>
        </div>
      ) : (
        <div className="mt-8">
          <SortableList
            items={sortableItems}
            onSave={reorderExperiences}
            empty="No experiences yet."
          />
        </div>
      )}

      <form
        id="add-experience"
        action={saveExperience}
        className="mt-8 max-w-2xl rounded border border-[#c9bfa8] bg-[#e8dfca] p-6"
      >
        <h2 className="font-serif text-2xl sm:text-3xl">Add Experience</h2>
        
        <label className="mt-4 block text-sm font-semibold">
          Experience Name
          <input name="name" required className={field} />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Slug
          <input name="slug" required className={field} />
          <span className="mt-1 block text-xs text-[#657064]">
            URL-friendly identifier (e.g., morning-coffee)
          </span>
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Description
          <textarea name="description" required rows={4} className={field} />
        </label>

        <div className="mt-4">
          <MediaPicker name="image_media_id" media={media} />
        </div>

        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input name="is_active" type="checkbox" defaultChecked />
            Active
          </label>
          
          <label className="flex items-center gap-2 text-sm">
            Status:
            <select name="status" className="rounded border px-2 py-1 text-sm">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <button
          className="mt-6 w-full rounded bg-[#b65d40] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9b5a42]"
          type="submit"
        >
          Create Experience
        </button>
      </form>
    </section>
  );
}
