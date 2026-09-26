"use client";

import { RowFeedback } from "@/components/admin/row-feedback";
import { RowLink } from "@/components/admin/row-link";
import { SortableList } from "@/components/admin/sortable-list";
import { useRowOperation } from "@/components/admin/use-row-operation";
import {
  reorderHomepageSections,
  toggleHomepageSection,
} from "@/lib/admin/homepage-actions";
import {
  ROW_ACTION_BORDERED,
  ROW_ACTION_PRIMARY,
} from "@/components/ui/control";

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
    name: "Momen Chatten",
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
    description: "Pilihan menu yang tampil di beranda.",
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
  const rowOperation = useRowOperation();

  function toggle(id: string, visible: boolean) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("visible", String(visible));
    return toggleHomepageSection(formData);
  }

  return (
    <SortableList
      onSave={reorderHomepageSections}
      rowBusy={rowOperation.busy}
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
          actions: ({ reorderBusy }: { reorderBusy: boolean }) => {
            const pending = rowOperation.isPending(row.id);
            const locked = reorderBusy || rowOperation.busy;
            return (
              <>
                <button
                  type="button"
                  disabled={locked}
                  aria-busy={pending}
                  className={ROW_ACTION_BORDERED}
                  onClick={() =>
                    rowOperation.run(
                      row.id,
                      () => toggle(row.id, !row.is_visible),
                      row.is_visible
                        ? "Bagian beranda disembunyikan."
                        : "Bagian beranda ditampilkan.",
                      "Status tampil bagian beranda gagal diperbarui.",
                    )
                  }
                >
                  {pending
                    ? "Menyimpan…"
                    : row.is_visible
                      ? "Sembunyikan"
                      : "Tampilkan"}
                </button>
                <RowLink
                  locked={locked}
                  className={ROW_ACTION_PRIMARY}
                  href={item.href}
                >
                  Edit
                </RowLink>
                <RowFeedback feedback={rowOperation.feedback(row.id)} />
              </>
            );
          },
        }];
      })}
      empty="Belum ada bagian beranda."
    />
  );
}
