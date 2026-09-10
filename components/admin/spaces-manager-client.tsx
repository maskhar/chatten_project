"use client";

import Image from "next/image";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/media-picker";
import { saveSpace } from "@/lib/admin/space-actions";

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
  rights_status: string;
  width: number | null;
  height: number | null;
  bucket: string;
  storage_path: string;
};

const field = "mt-1 w-full rounded border px-3 py-2";

export function SpacesManagerClient({ spaces, media, baseUrl }: { spaces: Space[]; media: Media[]; baseUrl: string }) {
  const imageUrl = (id: string | null) => {
    const image = media.find((item) => item.id === id);
    return image ? `${baseUrl}/storage/v1/object/public/${image.bucket}/${image.storage_path}` : null;
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b5a42]">Website</p>
          <h1 className="mt-2 font-serif text-5xl">Spaces</h1>
          <p className="mt-3 max-w-2xl text-[#596052]">Manage the spaces guests can discover and use at Chatten.</p>
        </div>
        <a href="#add-space" className="rounded bg-[#b65d40] px-5 py-3 text-sm font-semibold text-white">+ Add Space</a>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {spaces.length ? spaces.map((space) => {
            const image = imageUrl(space.image_media_id);
            return (
              <article key={space.id} className="grid gap-5 rounded border border-[#c9bfa8] bg-white p-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
                {image ? <Image src={image} alt={space.name} width={240} height={160} className="h-28 w-full rounded object-cover" /> : <div className="h-28 rounded bg-[#405542]" />}
                <div className="min-w-0">
                  <h2 className="font-serif text-3xl">{space.name}</h2>
                  <p className="mt-1 text-xs text-[#657064]">/{space.slug}</p>
                  {space.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#596052]">{space.description}</p> : null}
                  <div className="mt-3 flex gap-2 text-xs font-semibold">
                    <span className="rounded bg-[#eef1ea] px-2 py-1">{space.status === "published" ? "Published" : "Draft"}</span>
                    <span className="rounded bg-[#eef1ea] px-2 py-1">{space.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <Link href={`/admin/spaces/items/${space.id}`} className="rounded border border-[#1f3426] px-4 py-2 text-center text-sm font-semibold text-[#1f3426]">Edit</Link>
              </article>
            );
          }) : (
            <div className="rounded border border-dashed border-[#c9bfa8] bg-white p-10 text-center">
              <p className="font-serif text-3xl">No spaces have been added yet.</p>
              <a href="#add-space" className="mt-5 inline-block rounded bg-[#b65d40] px-5 py-3 text-sm font-semibold text-white">Add Space</a>
            </div>
          )}
        </div>

        <form id="add-space" action={saveSpace} className="h-fit grid gap-4 rounded border border-[#c9bfa8] bg-[#e8dfca] p-6">
          <h2 className="font-serif text-3xl">Add Space</h2>
          <label className="text-sm font-semibold">Space Name<input name="name" required className={field} /></label>
          <label className="text-sm font-semibold">Slug<input name="slug" className={field} /><span className="mt-1 block text-xs font-normal text-[#657064]">Leave blank to generate from name.</span></label>
          <label className="text-sm font-semibold">Description<textarea name="description" rows={5} className={field} /></label>
          <MediaPicker name="image_media_id" media={media} />
          <label className="flex items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked />Active</label>
          <label className="text-sm font-semibold">Status<select name="status" defaultValue="draft" className={field}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <button className="rounded bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white" type="submit">Create Space</button>
        </form>
      </div>
    </section>
  );
}
