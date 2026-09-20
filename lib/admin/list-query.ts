import type { Resource } from "@/lib/admin/resources";

// A27: the generic resource list rendered every row of a table with no search,
// no status filter and no pagination. That is tolerable for eight hero slides
// and unusable for a menu; it also meant one page load pulled every column of
// every row. These helpers turn the URL's search parameters into an explicit,
// clamped query plan so the page component stays declarative and the awkward
// parts (untrusted page numbers, PostgREST's inclusive range, `%` and `,` in a
// search term) are covered by tests.

export const PAGE_SIZE = 25;

export type ListQuery = { search: string; status: "" | "draft" | "published"; page: number };

export function parseListQuery(params: Record<string, string | string[] | undefined>): ListQuery {
  const raw = (key: string) => { const value = params[key]; return Array.isArray(value) ? value[0] : value; };
  const status = raw("status");
  const page = Number.parseInt(raw("page") ?? "1", 10);
  return {
    search: (raw("q") ?? "").trim().slice(0, 100),
    status: status === "draft" || status === "published" ? status : "",
    // A page number arrives from the URL, so it can be absent, negative, zero,
    // fractional or not a number at all. Anything unusable becomes page 1.
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

// Only text-ish fields are worth an ilike; numbers, checkboxes and media ids
// are not things an operator types into a search box.
export function searchableColumns(resource: Resource): string[] {
  return resource.fields.filter((field) => !field.type || field.type === "text" || field.type === "textarea").map((field) => field.key);
}

// PostgREST `or=` takes a comma-separated list, so an unescaped comma in the
// term would be read as a filter separator, and `%`/`_` are ilike wildcards
// that would otherwise let a stray character change what the query matches.
export function escapeSearchTerm(term: string) {
  return term.replace(/[\\%_,()]/g, (char) => `\\${char}`);
}

export function buildSearchFilter(resource: Resource, search: string) {
  const term = search.trim();
  if (!term) return "";
  const columns = searchableColumns(resource);
  if (!columns.length) return "";
  return columns.map((column) => `${column}.ilike.%${escapeSearchTerm(term)}%`).join(",");
}

export function resourceHasStatus(resource: Resource) {
  return resource.fields.some((field) => field.key === "status");
}

// PostgREST's `.range()` is inclusive at both ends, so the last index is
// offset + size - 1, not offset + size.
export function pageRange(page: number, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function paginationState(total: number, page: number, size = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  // Deleting the last row of the last page can leave the operator on a page
  // that no longer exists; clamp rather than showing an empty list.
  const current = Math.min(page, pageCount);
  return { pageCount, current, hasPrevious: current > 1, hasNext: current < pageCount, from: total ? (current - 1) * size + 1 : 0, to: Math.min(current * size, total) };
}

export function listHref(basePath: string, query: ListQuery, overrides: Partial<ListQuery> = {}) {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.search) params.set("q", merged.search);
  if (merged.status) params.set("status", merged.status);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
