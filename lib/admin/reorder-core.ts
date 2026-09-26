// Pure half of the reorder path: no server-only import and no Supabase
// dependency, so the validation rules can be covered by node:test without a
// database. lib/admin/reorder.ts holds the part that actually talks to it.

/**
 * Mirrors the allowlist inside `chatten_cafe.reorder_rows`. The database is
 * the real boundary — it raises on anything outside its own list — but
 * duplicating it here turns a bad table name into a compile error instead of a
 * failed mutation an editor sees as "Gagal menyimpan urutan".
 */
export const REORDERABLE_TABLES = [
  "hero_slides",
  "moments",
  "about_sections",
  "experiences",
  "spaces",
  "menu_categories",
  "menu_items",
  "gallery_items",
  "testimonials",
  "social_links",
  "navigation_items",
  "homepage_sections",
] as const;

export type ReorderableTable = (typeof REORDERABLE_TABLES)[number];

/**
 * Narrows an arbitrary table name to a reorderable one.
 *
 * The generic CMS action resolves its table from the resource registry, which
 * includes tables that carry a sort_order but must not go through this path:
 * opening_hours is unique on (day_of_week, sort_order), so a flat renumber
 * across all seven days would collide.
 */
export function isReorderableTable(table: string): table is ReorderableTable {
  return (REORDERABLE_TABLES as readonly string[]).includes(table);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The checks that must happen before an id list reaches the database.
 *
 * The old per-action guard was `/^[0-9a-f-]{36}$/i`, which accepts any
 * 36-character run of hex digits and dashes — `------------------------------------`
 * passed it. None of them checked for duplicates either, and a repeated id
 * means two positions compete for one row, so an entry silently vanishes from
 * the order.
 */
export function validateReorderIds(ids: readonly string[], label = "urutan") {
  if (!Array.isArray(ids)) throw new Error(`${label} tidak valid.`);
  if (ids.some((id) => !UUID.test(id))) throw new Error(`${label} tidak valid.`);
  if (new Set(ids).size !== ids.length) throw new Error(`${label} tidak valid.`);
  return ids;
}

/**
 * Confirms that a non-paginated reorder submitted every current row exactly
 * once. A subset cannot safely be renumbered from zero: omitted rows retain
 * their ranks and may collide with the submitted rows.
 *
 * Paginated resource lists deliberately do not use this helper. They submit a
 * page plus an offset and preserve rows outside that page.
 */
export function isCompleteReorderSet(submittedIds: readonly string[], existingIds: readonly string[]) {
  if (submittedIds.length !== existingIds.length) return false;
  const submitted = new Set(submittedIds);
  const existing = new Set(existingIds);
  return (
    submitted.size === submittedIds.length
    && existing.size === existingIds.length
    && existingIds.every((id) => submitted.has(id))
  );
}

/** Rejects a negative or non-integer offset, which would write negative ranks. */
export function normalizeOffset(raw: unknown) {
  const value = Number(raw ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
