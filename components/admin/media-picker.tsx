"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { mediaHrefById } from "@/lib/media/url";
import { filterPickerMedia, pickerCategories } from "@/lib/media/picker-filter";

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

export function MediaPicker({
  name,
  value,
  media,
  required = false,
}: {
  name: string;
  value?: string;
  media: Media[];
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState(value ?? "");

  const categories = useMemo(() => pickerCategories(media), [media]);

  const filtered = useMemo(
    () => filterPickerMedia(media, query, categoryFilter),
    [media, query, categoryFilter],
  );

  const current = media.find((item) => item.id === selected);

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
  };

  const hasActiveFilters = query || categoryFilter;

  return (
    <div className="@container mt-2 grid min-w-0 w-full gap-3 rounded border border-line bg-paper p-4">
      <input type="hidden" name={name} value={selected} />
      {current ? (
        <div className="flex min-w-0 flex-wrap items-center gap-3 rounded border border-sage-deep bg-white p-3 shadow-sm">
          <Image
            src={mediaHrefById(current.id)!}
            alt={current.alt_text ?? current.title ?? ""}
            width={96}
            height={72}
            className="h-16 w-20 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-leaf-ink">
              Terpilih
            </p>
            <p className="mt-1 truncate font-medium">
              {current.title ?? "Gambar tanpa judul"}
            </p>
            <p className="truncate text-xs text-ink">
              {current.alt_text ?? "Tanpa teks alternatif"}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 @sm:w-auto @sm:shrink-0">
            <button
              type="button"
              className="rounded border border-sage-deep bg-white px-3 py-1.5 text-sm font-medium hover:bg-paper"
              onClick={() => setSelected("")}
            >
              Ganti
            </button>
            {!required && (
              <button
                type="button"
                className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-white"
                onClick={() => setSelected("")}
              >
                Hapus pilihan
              </button>
            )}
          </div>
        </div>
      ) : null}
      <div className="grid min-w-0 w-full gap-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari gambar..."
          aria-label="Cari gambar"
          className="min-w-0 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter kategori"
          className="min-w-0 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-paper"
          >
            Bersihkan filter
          </button>
        )}
      </div>
      {media.length === 0 ? (
        <div className="rounded border border-sand-deep bg-cream p-6 text-center">
          <p className="font-medium text-bark">Belum ada gambar</p>
          <p className="mt-2 text-sm text-bark">
            Unggah gambar di Pustaka Media dan gambar akan langsung tampil di sini.
          </p>
          <Link
            href="/admin/media"
            className="mt-4 inline-block rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-soft"
          >
            Buka Pustaka Media
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-line bg-white p-6 text-center">
          <p className="text-sm text-ink">Tidak ada gambar yang sesuai dengan filter.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium underline"
          >
            Bersihkan filter
          </button>
        </div>
      ) : (
        <div className="grid min-w-0 w-full max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded border border-mist bg-white p-2 @xs:grid-cols-2 @lg:grid-cols-3">
          {filtered.map((item) => {
            const url = mediaHrefById(item.id)!;
            const isSelected = selected === item.id;
            return (
              <button
                type="button"
                onClick={() => setSelected(item.id)}
                className={`min-w-0 w-full overflow-hidden rounded border text-left transition-all ${isSelected ? "border-leaf-ink ring-2 ring-leaf-ink ring-offset-1" : "border-mist hover:border-sage-deep"}`}
                key={item.id}
                aria-label={`Pilih ${item.title ?? item.alt_text ?? "gambar"}`}
                aria-pressed={isSelected}
              >
                <Image
                  src={url}
                  alt={item.alt_text ?? item.title ?? ""}
                  width={180}
                  height={120}
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-2">
                  {isSelected && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-leaf-ink">
                      Terpilih
                    </p>
                  )}
                  <span className="block truncate text-xs">
                    {item.title ?? item.alt_text ?? "Tanpa judul"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
