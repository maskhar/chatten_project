"use client";
import Image from "next/image";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveExperience } from "@/lib/admin/experience-actions";

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
  baseUrl,
}: {
  experiences: Experience[];
  media: Media[];
  baseUrl: string;
}) {
  const image = (id: string | null) => {
    const row = media.find((item) => item.id === id);
    return row
      ? `${baseUrl}/storage/v1/object/public/${row.bucket}/${row.storage_path}`
      : null;
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b5a42]">
            Website
          </p>
          <h1 className="mt-2 font-serif text-5xl">Experiences</h1>
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
        <div className="mt-8 grid gap-4">
          {experiences.map((experience) => {
            const imgUrl = image(experience.image_media_id);
            return (
              <div
                key={experience.id}
                className="flex gap-4 rounded border border-[#c9bfa8] bg-[#ede3d0] p-5"
              >
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={experience.name}
                    width={160}
                    height={120}
                    className="h-24 w-32 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-24 w-32 flex-shrink-0 rounded bg-[#405542]" />
                )}
                <div className="flex-1">
                  <h2 className="font-serif text-2xl">{experience.name}</h2>
                  <p className="mt-1 text-sm text-[#657064]">/{experience.slug}</p>
                  {experience.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#596052] line-clamp-2">
                      {experience.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        experience.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {experience.status}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        experience.is_active
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {experience.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start">
                  <Link
                    href={`/admin/experiences/items/${experience.id}`}
                    className="rounded border border-[#1f3426] px-3 py-2 text-sm font-semibold text-[#1f3426] hover:bg-[#1f3426] hover:text-white"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form
        id="add-experience"
        action={saveExperience}
        className="mt-8 max-w-2xl rounded border border-[#c9bfa8] bg-[#e8dfca] p-6"
      >
        <h2 className="font-serif text-3xl">Add Experience</h2>
        
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
