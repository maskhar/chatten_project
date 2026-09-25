"use client";

import Link from "next/link";
import { SortableList } from "@/components/admin/sortable-list";
import {
  reorderHomepageSections,
  toggleHomepageSection,
} from "@/lib/admin/homepage-actions";
import { ROW_ACTION_BORDERED, ROW_ACTION_PRIMARY } from "@/components/ui/control";

type Section = {
  id: string;
  section_key: string;
  sort_order: number;
  is_visible: boolean;
};

const registry: Record<string, { name: string; description: string; href: string }> = {
  hero: {
    name: "Hero",
    description: "Kesan pertama, gambar utama, dan ajakan bertindak.",
    href: "/admin/hero",
  },
  moments: {
    name: "Chatten Moments",
    description: "Cerita destinasi dari pagi sampai malam.",
    href: "/admin/moments",
  },
  about: {
    name: "Tentang",
    description: "Cerita Chatten dan pengenalan merek.",
    href: "/admin/about",
  },
  menu: {
    name: "Menu Unggulan",
    description: "Pilihan menu yang tampil di homepage.",
    href: "/admin/menu",
  },
  spaces: {
    name: "Ruang",
    description: "Tempat berkumpul di Chatten.",
    href: "/admin/spaces",
  },
  experiences: {
    name: "Pengalaman",
    description: "Hal terkurasi untuk dilakukan dan dibagikan.",
    href: "/admin/experiences",
  },
  feature: {
    name: "Acara & Promosi",
    description: "Sorotan acara atau promosi saat ini.",
    href: "/admin/events",
  },
  gallery: {
    name: "Galeri",
    description: "Sekilas cerita Chatten lewat gambar.",
    href: "/admin/gallery",
  },
  testimonials: {
    name: "Testimoni",
    description: "Cerita pengunjung dan bukti sosial.",
    href: "/admin/testimonials",
  },
  visit: {
    name: "Kunjungi Chatten",
    description: "Alamat, jam operasional, dan petunjuk arah.",
    href: "/admin/contact",
  },
};

export function HomepageSortable({ rows }: { rows: Section[] }) {
  return (
    <SortableList
      onSave={reorderHomepageSections}
      items={rows.flatMap((row) => {
        const item = registry[row.section_key];
        if (!item) return [];
        return [{
          id: row.id,
          label: item.name,
          detail: (
            <>
              <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
              <p className="mt-1 text-xs">
                {row.is_visible ? "Tampil" : "Disembunyikan"}
              </p>
            </>
          ),
          // One client-side order is saved atomically. The old secondary server
          // action buttons raced the list order and hit the immediate unique
          // index during every adjacent swap.
          actions: (
            <>
              <form action={toggleHomepageSection}>
                <input type="hidden" name="id" value={row.id} />
                <input
                  type="hidden"
                  name="visible"
                  value={String(!row.is_visible)}
                />
                <button className={ROW_ACTION_BORDERED}>
                  {row.is_visible ? "Sembunyikan" : "Tampilkan"}
                </button>
              </form>
              <Link className={ROW_ACTION_PRIMARY} href={item.href}>
                Edit
              </Link>
            </>
          ),
        }];
      })}
      empty="Belum ada bagian homepage."
    />
  );
}
