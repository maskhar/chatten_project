// The option lists the settings-class CMS forms pick from.
//
// Phase 6 left About, Testimonials, Contact & Visit, Opening Hours, Social
// Links, Navigation, SEO and Site Settings on the generic resource form with
// bare text and number inputs. That form is otherwise the right shape for
// them — it already has search, status filtering, pagination, drag ordering,
// media picking and the unsaved-changes guard — so the gap was the fields
// themselves, not the page.
//
// Four of those forms asked an editor to type a value from a closed set with
// nothing on screen to say what the set was:
//
//   - opening_hours.day_of_week was a raw integer box. Nothing said whether 0
//     was Sunday or Monday, and 7 was accepted and then silently never
//     matched a day on the public site.
//   - social_links.platform is the key the footer renders and the JSON-LD
//     sameAs list keys off; "IG" and "instagram" produced different output.
//   - navigation_items.href had to match a real route. A typo produced a
//     header link to a 404, and the fallback navigation only appears when the
//     table is empty, so one bad row could not be recovered by emptying it.
//   - seo_settings.page_key has to equal the string its page passes to
//     seoMetadata(). A mismatch meant the row existed, looked saved, and
//     changed nothing.
//
// This module is pure so both the form and the server action read the same
// lists, and node:test can check them against the code that consumes them.

export type Option = { value: string; label: string };

/** Minggu lebih dulu, mengikuti Postgres `extract(dow)` dan `opening_hours.day_of_week`. */
export const DAY_OPTIONS: readonly Option[] = [
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
] as const;

/**
 * The platforms the footer knows how to label.
 *
 * `label` on the row still overrides the display text; this fixes the key, so
 * two rows for the same network cannot disagree on spelling.
 */
export const SOCIAL_PLATFORM_OPTIONS: readonly Option[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "x", label: "X" },
  { value: "threads", label: "Threads" },
  { value: "google", label: "Google Business Profile" },
] as const;

/**
 * Every public route a navigation entry may point at.
 *
 * Kept in step with app/ by tests/field-options.test.mjs, which walks the
 * route directory: a new public page that is not offered here is a test
 * failure rather than a route an editor cannot link to.
 */
export const NAVIGATION_ROUTE_OPTIONS: readonly Option[] = [
  { value: "/", label: "Beranda" },
  { value: "/about", label: "Tentang" },
  { value: "/experience", label: "Pengalaman" },
  { value: "/menu", label: "Menu" },
  { value: "/spaces", label: "Ruang" },
  { value: "/events", label: "Acara" },
  { value: "/gallery", label: "Galeri" },
  { value: "/visit", label: "Kunjungi" },
] as const;

/**
 * The page keys `seoMetadata()` actually looks up.
 *
 * A row whose page_key matches nothing is inert: it saves, it lists, and no
 * page ever reads it. The home page builds its metadata from site_settings
 * rather than from seo_settings, so it is deliberately not offered.
 */
export const SEO_PAGE_KEY_OPTIONS: readonly Option[] = [
  { value: "about", label: "Tentang" },
  { value: "experience", label: "Pengalaman" },
  { value: "menu", label: "Menu" },
  { value: "spaces", label: "Ruang" },
  { value: "events", label: "Acara" },
  { value: "gallery", label: "Galeri" },
  { value: "visit", label: "Kunjungi" },
] as const;

/** The robots directives worth offering; anything else is a typo, not a choice. */
export const ROBOTS_OPTIONS: readonly Option[] = [
  { value: "", label: "Bawaan (index, follow)" },
  { value: "index, follow", label: "Indeks dan ikuti tautan" },
  { value: "noindex, follow", label: "Sembunyikan dari pencarian, ikuti tautan" },
  { value: "noindex, nofollow", label: "Sembunyikan dari pencarian, abaikan tautan" },
] as const;

export function optionValues(options: readonly Option[]) {
  return options.map((option) => option.value);
}

export function labelFor(options: readonly Option[], value: unknown) {
  const found = options.find((option) => option.value === String(value ?? ""));
  return found ? found.label : null;
}
