"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { mediaHrefById } from "@/lib/media/url";

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

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    media.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) {
        uniqueCategories.add(cat);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [media]);

  const filtered = useMemo(
    () =>
      media.filter((item) => {
        const searchText = `${item.title ?? ""} ${item.alt_text ?? ""} ${item.category ?? ""}`.toLowerCase();
        const matchesSearch = query ? searchText.includes(query.toLowerCase()) : true;
        const matchesCategory = categoryFilter ? item.category?.trim() === categoryFilter : true;
        return matchesSearch && matchesCategory;
      }),
    [media, query, categoryFilter],
  );

  const current = media.find((item) => item.id === (selected || value));

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
  };

  const hasActiveFilters = query || categoryFilter;

  return (
    <div className="mt-2 grid gap-3 rounded border border-[#c9bfa8] bg-[#faf8f4] p-4">
      <input type="hidden" name={name} value={selected || value || ""} />
      {current ? (
        <div className="flex items-center gap-3 rounded border border-[#8b9d83] bg-white p-3 shadow-sm">
          <Image
            src={mediaHrefById(current.id)!}
            alt={current.alt_text ?? current.title ?? ""}
            width={96}
            height={72}
            className="h-16 w-20 rounded object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#47714d]">
              Selected
            </p>
            <p className="mt-1 truncate font-medium">
              {current.title ?? "Untitled image"}
            </p>
            <p className="text-xs text-[#596052]">
              {current.alt_text ?? "No alt text"}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="rounded border border-[#8b9d83] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#f5f7f3]"
              onClick={() => setSelected("")}
            >
              Replace
            </button>
            {!required && (
              <button
                type="button"
                className="rounded border border-[#c9bfa8] px-3 py-1.5 text-sm text-[#596052] hover:bg-white"
                onClick={() => setSelected("")}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search approved images..."
          className="rounded border border-[#c9bfa8] bg-white px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded border border-[#c9bfa8] bg-white px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
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
            className="rounded border border-[#c9bfa8] bg-white px-3 py-2 text-sm text-[#596052] hover:bg-[#f5f7f3]"
          >
            Clear filters
          </button>
        )}
      </div>
      {media.length === 0 ? (
        <div className="rounded border border-[#e4d6bd] bg-[#fffaf0] p-6 text-center">
          <p className="font-medium text-[#8b6f47]">No approved images yet</p>
          <p className="mt-2 text-sm text-[#9b8563]">
            Upload and approve images in the Media Library before selecting them here.
          </p>
          <Link
            href="/admin/media"
            className="mt-4 inline-block rounded bg-[#1f3426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d4a37]"
          >
            Open Media Library
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-[#c9bfa8] bg-white p-6 text-center">
          <p className="text-sm text-[#596052]">No images match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded border border-[#ddd9cf] bg-white p-2 sm:grid-cols-3">
          {filtered.map((item) => {
            const url = mediaHrefById(item.id)!;
            const effectiveSelected = selected || value || "";
            const isSelected = effectiveSelected === item.id;
            return (
              <button
                type="button"
                onClick={() => setSelected(item.id)}
                className={`overflow-hidden rounded border text-left transition-all ${isSelected ? "border-[#47714d] ring-2 ring-[#47714d] ring-offset-1" : "border-[#ddd9cf] hover:border-[#8b9d83]"}`}
                key={item.id}
                aria-label={`Select ${item.title ?? item.alt_text ?? "image"}`}
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
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#47714d]">
                      Selected
                    </p>
                  )}
                  <span className="block truncate text-xs">
                    {item.title ?? item.alt_text ?? "Untitled"}
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
