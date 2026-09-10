"use client";
import { useState } from "react";
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

export function ExperienceEditForm({
  experience,
  media,
  baseUrl,
}: {
  experience: Experience;
  media: Media[];
  baseUrl: string;
}) {
  const image = (id: string | null) => {
    const row = media.find((item) => item.id === id);
    return row
      ? `${baseUrl}/storage/v1/object/public/${row.bucket}/${row.storage_path}`
      : null;
  };

  const imgUrl = image(experience.image_media_id);

  return (
    <section>
      <div className="mb-6">
        <Link
          href="/admin/experiences"
          className="text-sm text-[#657064] hover:text-[#1f3426]"
        >
          ← Back to Experiences
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b5a42]">
            Edit Experience
          </p>
          <h1 className="mt-2 font-serif text-5xl">{experience.name}</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={saveExperience} className="grid gap-6">
          <input type="hidden" name="id" value={experience.id} />

          <div>
            <label className="block text-sm font-semibold">
              Experience Name
              <input
                name="name"
                required
                defaultValue={experience.name}
                className={field}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold">
              Slug
              <input
                name="slug"
                required
                defaultValue={experience.slug}
                className={field}
              />
              <span className="mt-1 block text-xs text-[#657064]">
                URL-friendly identifier (e.g., morning-coffee)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold">
              Description
              <textarea
                name="description"
                required
                rows={6}
                defaultValue={experience.description ?? ""}
                className={field}
              />
            </label>
          </div>

          <div>
            <MediaPicker
              name="image_media_id"
              media={media}
              value={experience.image_media_id ?? undefined}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={experience.is_active}
              />
              Active
            </label>

            <label className="flex items-center gap-2 text-sm">
              Status:
              <select
                name="status"
                defaultValue={experience.status}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              className="rounded bg-[#1f3426] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2a4735]"
              type="submit"
            >
              Save Changes
            </button>
            <Link
              href="/admin/experiences"
              className="rounded border border-[#1f3426] px-6 py-3 text-sm font-semibold text-[#1f3426] hover:bg-[#f7f5f0]"
            >
              Cancel
            </Link>
          </div>
        </form>

        {imgUrl && (
          <div className="h-fit rounded border bg-white p-4">
            <p className="text-sm font-semibold">Current Image</p>
            <Image
              src={imgUrl}
              alt={experience.name}
              width={320}
              height={240}
              className="mt-3 w-full rounded object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}