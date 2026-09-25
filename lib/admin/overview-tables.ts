// A25: the dashboard reported four raw row counts and a single `drafts` number
// that only ever looked at hero_slides, so an editor could leave a menu item or
// an event in draft indefinitely and the overview would still read "0 drafts".
// These descriptors list every editorial table that has a `status` column, with
// the column that actually holds its human label — the schema is not uniform
// (`title`, `name`, `author_name`), so it has to be declared per table.
//
// This module deliberately has no server-only import and no Supabase
// dependency: the descriptors and the merge are pure, so they can be covered by
// the node:test suite without a database.
import type { StatusTableName } from "@/types/tables";
// The import is type-only, so it is erased before this module runs and the
// no-runtime-dependency property above is preserved.
export type EditorialTable = { table: StatusTableName; label: string; href: string; titleColumn: string };

export const editorialTables: readonly EditorialTable[] = [
  { table: "hero_slides", label: "Slide hero", href: "/admin/hero", titleColumn: "title" },
  { table: "moments", label: "Momen", href: "/admin/homepage", titleColumn: "name" },
  { table: "about_sections", label: "Bagian tentang", href: "/admin/about", titleColumn: "title" },
  { table: "experiences", label: "Pengalaman", href: "/admin/experiences", titleColumn: "name" },
  { table: "spaces", label: "Ruang", href: "/admin/spaces", titleColumn: "name" },
  { table: "menu_items", label: "Item menu", href: "/admin/menu", titleColumn: "name" },
  { table: "gallery_items", label: "Item galeri", href: "/admin/gallery", titleColumn: "title" },
  { table: "testimonials", label: "Testimoni", href: "/admin/testimonials", titleColumn: "author_name" },
  { table: "promotions", label: "Promosi", href: "/admin/promotions", titleColumn: "title" },
  { table: "events", label: "Acara", href: "/admin/events", titleColumn: "title" },
] as const;

export type DraftGroup = { label: string; href: string; drafts: number; total: number };
export type ActivityEntry = { label: string; href: string; group: string; status: string; updatedAt: string };

export function toActivityEntries(entry: EditorialTable, rows: readonly Record<string, unknown>[]): ActivityEntry[] {
  return rows.map((row) => ({
    label: String(row[entry.titleColumn] ?? "Tanpa judul"),
    href: entry.href,
    group: entry.label,
    status: String(row.status ?? "draft"),
    updatedAt: String(row.updated_at ?? ""),
  }));
}

// PostgREST cannot union across tables and a database view would need its own
// RLS policy, so each table is queried separately and merged here. Rows without
// an `updated_at` are dropped rather than sorted to the end — an undated entry
// in a feed labelled "recent" is worse than no entry.
export function mergeActivity(groups: readonly ActivityEntry[][], limit: number): ActivityEntry[] {
  return groups
    .flat()
    .filter((row) => row.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function summariseDrafts(groups: readonly DraftGroup[]) {
  const pending = groups.filter((group) => group.drafts > 0).sort((a, b) => b.drafts - a.drafts);
  return {
    pending,
    totalDrafts: groups.reduce((sum, group) => sum + group.drafts, 0),
    totalRows: groups.reduce((sum, group) => sum + group.total, 0),
  };
}
