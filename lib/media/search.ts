export type SearchableMedia = { title?: string | null; alt_text?: string | null; caption?: string | null; original_filename?: string | null; rights_status?: string | null; usage_count?: number };
export function filterMediaBySearch<T extends SearchableMedia>(items: T[], query: string, rights = "", usage = "") {
  const needle = query.trim().toLowerCase();
  const normalizedRights = ["approved", "unknown", "restricted"].includes(rights) ? rights : "";
  const normalizedUsage = ["used", "unused"].includes(usage) ? usage : "";
  return items.filter((item) => {
    const matchesSearch = !needle || [item.title, item.alt_text, item.caption, item.original_filename].some((value) => String(value ?? "").toLowerCase().includes(needle));
    const matchesRights = !normalizedRights || item.rights_status === normalizedRights;
    const count = item.usage_count ?? 0;
    const matchesUsage = !normalizedUsage || (normalizedUsage === "used" ? count > 0 : count === 0);
    return matchesSearch && matchesRights && matchesUsage;
  });
}
