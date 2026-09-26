import Image from "next/image";
import Link from "next/link";
import { MediaDeleteControl } from "@/components/admin/media-delete-control";
import { MediaUploadDropzone } from "@/components/admin/media-upload-dropzone";
import { filterMediaBySearch, mediaCategories } from "@/lib/media/search";
import { mediaUsageCount } from "@/lib/media/usage";
import { loadMediaUsageMap } from "@/lib/media/usage-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; usage?: string; category?: string }>;
type MediaRow = Record<string, unknown> & { usage_count?: number };

export default async function MediaPage({ searchParams }: { searchParams: SearchParams }) {
  const { q: rawQuery = "", usage: rawUsage = "", category: rawCategory = "" } = await searchParams;
  const q = rawQuery.trim();
  const usageFilter = ["used", "unused"].includes(rawUsage) ? rawUsage : "";
  const category = rawCategory.trim();
  const supabase = await createServerSupabaseClient();
  const [result, usage] = await Promise.all([
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    loadMediaUsageMap(),
  ]);
  if (result.error) throw new Error("Pustaka Media tidak dapat dimuat.");

  const rows = (result.data ?? []) as MediaRow[];
  const categories = mediaCategories(rows);
  const rowsWithUsage = rows.map((row) => ({
    ...row,
    usage_count: mediaUsageCount(usage, String(row.id)),
  }));
  const filtered = filterMediaBySearch(rowsWithUsage, q, usageFilter, category) as Array<MediaRow & { usage_count: number }>;
  const filtering = Boolean(q || usageFilter || category);

  return (
    <section>
      <p className="text-xs uppercase tracking-[.2em] text-rust">Media</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl">Pustaka Media</h1>
      <form className="mt-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="media-search">Cari media</label>
        <input
          id="media-search"
          name="q"
          defaultValue={q}
          placeholder="Cari media…"
          className="min-w-0 flex-1 border border-line bg-white px-3 py-2"
        />
        <button className="border border-forest px-4 py-2 text-sm font-semibold">Cari</button>
        <label className="sr-only" htmlFor="media-usage">Penggunaan</label>
        <select id="media-usage" name="usage" defaultValue={usageFilter} className="border border-line px-3 py-2">
          <option value="">Semua penggunaan</option>
          <option value="used">Digunakan</option>
          <option value="unused">Belum digunakan</option>
        </select>
        <label className="sr-only" htmlFor="media-category">Kategori</label>
        <select id="media-category" name="category" defaultValue={category} className="border border-line px-3 py-2">
          <option value="">Semua kategori</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        {filtering ? <Link href="/admin/media" className="px-4 py-2 text-sm underline">Hapus filter</Link> : null}
      </form>
      <p className="mt-3 text-sm text-ink">
        {filtering ? `${filtered.length} dari ${rows.length}` : rows.length} gambar
      </p>
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <MediaUploadDropzone />
        <div>
          {!rows.length ? <p>Belum ada gambar yang diunggah.</p> : null}
          {rows.length && !filtered.length ? (
            <p>Tidak ada gambar yang cocok dengan “{q}”. <Link href="/admin/media" className="underline">Hapus filter</Link></p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => {
              const id = String(row.id);
              return (
                <article className="min-w-0 border border-line bg-sand p-5" key={id}>
                  <Image
                    className="aspect-square w-full object-cover"
                    src={`/api/media/${id}`}
                    alt={String(row.alt_text ?? "")}
                    width={Number(row.width) || 800}
                    height={Number(row.height) || 800}
                  />
                  <h2 className="mt-4 truncate font-semibold">{String(row.title ?? row.original_filename)}</h2>
                  <p className="text-xs">
                    {String(row.mime_type)} · {row.file_size ? `${Math.round(Number(row.file_size) / 1024)} KB` : "ukuran tidak diketahui"}
                  </p>
                  <p>Digunakan pada {mediaUsageCount(usage, id)} konten.</p>
                  <Link href={`/admin/media/items/${id}`} className="mt-4 inline-block underline">Lihat / Edit</Link>
                  <MediaDeleteControl
                    mediaId={id}
                    mediaName={String(row.title ?? row.original_filename ?? "gambar ini")}
                    references={usage.get(id) ?? []}
                  />
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
