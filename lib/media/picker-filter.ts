// The MediaPicker's filtering lived inline in the component, which meant the
// only way to test it was to copy the predicate into the test file — and a copy
// drifts. Pulling it out here lets the test exercise the same function the
// picker runs.
//
// This is deliberately not `filterMediaBySearch` from lib/media/search.ts: that
// one backs the Media Library grid, which also filters on usage count and
// matches the original filename. The picker searches what an operator can see
// on the tile — title, alt text, category.

export type PickerMedia = { title?: string | null; alt_text?: string | null; category?: string | null };

/** The distinct, trimmed categories present in `media`, sorted, blanks dropped. */
export function pickerCategories(media: PickerMedia[]): string[] {
  const unique = new Set<string>();
  for (const item of media) {
    const category = item.category?.trim();
    if (category) unique.add(category);
  }
  return Array.from(unique).sort();
}

/** Search and category narrow together: an image must satisfy both to show. */
export function filterPickerMedia<T extends PickerMedia>(media: T[], query: string, category: string): T[] {
  const needle = query.trim().toLowerCase();
  const wanted = category.trim();
  return media.filter((item) => {
    const haystack = `${item.title ?? ""} ${item.alt_text ?? ""} ${item.category ?? ""}`.toLowerCase();
    const matchesSearch = !needle || haystack.includes(needle);
    const matchesCategory = !wanted || item.category?.trim() === wanted;
    return matchesSearch && matchesCategory;
  });
}
