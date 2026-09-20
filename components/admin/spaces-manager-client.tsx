"use client";

import Image from "next/image";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/media-picker";
import { deleteSpace, reorderSpaces, saveSpace, setSpaceActive } from "@/lib/admin/space-actions";
import { SortableList } from "@/components/admin/sortable-list";
import { mediaHrefById } from "@/lib/media/url";

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

export function SpacesManagerClient({ spaces, media }: { spaces: Space[]; media: Media[] }) {
  const imageUrl = (id: string | null) => mediaHrefById(media.find((item) => item.id === id)?.id) ?? null;

  const handleVisibility = async (id: string, active: boolean) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("active", String(active));
    await setSpaceActive(formData);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete “${name}”? This removes the Space record but preserves its Media Library image.`)) return;
    const formData = new FormData();
    formData.append("id", id);
    await deleteSpace(formData);
  };

  const sortableItems = spaces.map((space) => ({
    id: space.id,
    label: space.name,
    detail: (
      <div className="mt-1 flex items-center gap-3">
        {imageUrl(space.image_media_id) ? <Image src={imageUrl(space.image_media_id) as string} alt={space.name} width={80} height={60} className="h-12 w-16 rounded object-cover" /> : <div className="h-12 w-16 rounded bg-[#405542]" />}
        <div className="min-w-0"><p className="text-xs text-[#657064]">/{space.slug}</p><div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded bg-[#eef1ea] px-2 py-1">{space.status === "published" ? "Published" : "Draft"}</span><span className="rounded bg-[#eef1ea] px-2 py-1">{space.is_active ? "Active" : "Hidden"}</span></div>{space.description ? <p className="mt-1 line-clamp-1 text-xs text-[#596052]">{space.description}</p> : null}</div>
      </div>
    ),
    actions: (
      <>
        <button type="button" onClick={() => handleVisibility(space.id, !space.is_active)} className="rounded border border-[#768075] px-2 py-1 text-xs font-semibold text-[#768075]">{space.is_active ? "Hide" : "Show"}</button>
        <Link href={`/admin/spaces/items/${space.id}`} className="rounded border border-[#1f3426] px-2 py-1 text-xs font-semibold text-[#1f3426]">Edit</Link>
        <button type="button" onClick={() => handleDelete(space.id, space.name)} className="rounded border border-[#b65d40] px-2 py-1 text-xs font-semibold text-[#b65d40]">Delete</button>
      </>
    ),
  }));

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
          {spaces.length ? <SortableList items={sortableItems} onSave={reorderSpaces} /> : (
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
