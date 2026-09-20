import type { TableName } from "@/types/tables";
import {
  DAY_OPTIONS,
  NAVIGATION_ROUTE_OPTIONS,
  ROBOTS_OPTIONS,
  SEO_PAGE_KEY_OPTIONS,
  SOCIAL_PLATFORM_OPTIONS,
  type Option,
} from "./field-options";

// `choices` is the labelled form of `options`: the form renders the label and
// posts the value, so an editor picks "Sunday" rather than typing 0. `help`
// is the one-line explanation shown under the input — several of these fields
// are keys that other code matches on, and nothing on screen said so.
export type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "checkbox" | "datetime-local" | "time" | "select" | "media"; options?: string[]; choices?: readonly Option[]; help?: string; required?: boolean };

/** The values a select-style field will accept, whichever form it was declared in. */
export function allowedValues(field: Field): string[] | null {
  if (field.choices) return field.choices.map((choice) => choice.value);
  if (field.options) return [...field.options];
  return null;
}
// `table` is the CMS write allowlist: a server action resolves a resource key
// to this value and writes to it. Typing it as TableName means a typo, or a
// table that no longer exists, is a build error rather than a runtime failure
// inside an authenticated mutation.
export type Resource = { key: string; label: string; table: TableName; group?: "website" | "content" | "settings"; description?: string; primaryKey?: string; fields: Field[] };
const editorial = [{ key: "sort_order", label: "Sort order", type: "number" as const }, { key: "is_active", label: "Active", type: "checkbox" as const }, { key: "status", label: "Status", type: "select" as const, options: ["draft", "published"] }];
export const resources: Resource[] = [
  { key: "hero", label: "Hero", table: "hero_slides", fields: [{ key: "title", label: "Title", required: true }, { key: "subtitle", label: "Subtitle", type: "textarea" }, { key: "cta_label", label: "CTA label" }, { key: "cta_url", label: "CTA URL" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "moments", label: "Chatten Moments", table: "moments", fields: [{ key: "name", label: "Name", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "about", label: "About", table: "about_sections", description: "The story blocks on /about, shown in display order.", fields: [{ key: "title", label: "Title", required: true }, { key: "body", label: "Body", type: "textarea", required: true, help: "One section of the story. Add several rows rather than one long block." }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "experiences", label: "Experiences", table: "experiences", fields: [{ key: "name", label: "Name", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Description", type: "textarea", required: true }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "spaces", label: "Spaces", table: "spaces", fields: [{ key: "name", label: "Name", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "gallery", label: "Gallery", table: "gallery_items", fields: [{ key: "title", label: "Title" }, { key: "alt_text", label: "Alt text", required: true }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "testimonials", label: "Testimonials", table: "testimonials", description: "Guest quotes. Only published, active rows appear on the site.", fields: [{ key: "author_name", label: "Author", required: true, help: "The name shown under the quote." }, { key: "quote", label: "Quote", type: "textarea", required: true }, { key: "source", label: "Source", help: "Optional. Where the quote came from, e.g. Google review." }, ...editorial] },
  { key: "promotions", label: "Promotions", table: "promotions", fields: [{ key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Summary", type: "textarea" }, { key: "body", label: "Body", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, { key: "starts_at", label: "Starts", type: "datetime-local" }, { key: "ends_at", label: "Ends", type: "datetime-local" }, ...editorial] },
  { key: "events", label: "Events", table: "events", fields: [{ key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Summary", type: "textarea" }, { key: "body", label: "Body", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, { key: "starts_at", label: "Starts", type: "datetime-local", required: true }, { key: "ends_at", label: "Ends", type: "datetime-local" }, ...editorial] },
  { key: "opening-hours", label: "Opening Hours", table: "opening_hours", fields: [{ key: "day_of_week", label: "Day", type: "select", choices: DAY_OPTIONS, required: true, help: "One row per day. A day with no row is simply not listed." }, { key: "opens_at", label: "Opens", type: "time", help: "Leave both times blank when the day is marked closed." }, { key: "closes_at", label: "Closes", type: "time", help: "Must be later than the opening time." }, { key: "is_closed", label: "Closed all day", type: "checkbox" }, { key: "sort_order", label: "Sort order", type: "number" }] },
  { key: "contact", label: "Contact", table: "contact_information", group: "settings", fields: [{ key: "address", label: "Address", type: "textarea", help: "Shown on /visit and in the business structured data." }, { key: "phone", label: "Phone", help: "Include the country code, e.g. +62 812 0000 0000." }, { key: "email", label: "Email" }, { key: "whatsapp_url", label: "WhatsApp URL", help: "A full https://wa.me/ link, not just the number." }, { key: "directions_url", label: "Directions URL", help: "The Google Maps link behind the Get Directions button." }, { key: "map_embed_url", label: "Map embed URL", help: "The https:// embed address from a supported map provider." }, { key: "is_active", label: "Active", type: "checkbox", help: "Only one row should be active; it is the one the site reads." }] },
  { key: "social", label: "Social Media", table: "social_links", group: "settings", fields: [{ key: "platform", label: "Platform", type: "select", choices: SOCIAL_PLATFORM_OPTIONS, required: true, help: "The network this link points at. Used as the key, so spelling matters." }, { key: "label", label: "Label", help: "Optional. Overrides the platform name in the footer." }, { key: "url", label: "URL", required: true, help: "Full https:// address of the profile." }, { key: "sort_order", label: "Sort order", type: "number" }, { key: "is_active", label: "Active", type: "checkbox" }] },
  { key: "navigation", label: "Navigation", table: "navigation_items", group: "settings", fields: [{ key: "label", label: "Label", required: true, help: "The wording shown in the header." }, { key: "href", label: "Page", type: "select", choices: NAVIGATION_ROUTE_OPTIONS, required: true, help: "Only existing public pages are offered; a typo here would be a header link to a 404." }, { key: "sort_order", label: "Sort order", type: "number" }, { key: "is_active", label: "Active", type: "checkbox" }] },
  { key: "seo", label: "SEO", table: "seo_settings", group: "settings", fields: [{ key: "page_key", label: "Page", type: "select", choices: SEO_PAGE_KEY_OPTIONS, required: true, help: "One row per page. The home page takes its title from Site Settings instead." }, { key: "title", label: "SEO title", help: "Blank keeps the page’s own title." }, { key: "description", label: "SEO description", type: "textarea", help: "Around 150–160 characters. Blank keeps the page’s own description." }, { key: "canonical_url", label: "Canonical URL", help: "Only set this when the page duplicates another address." }, { key: "og_media_id", label: "Social share image", type: "media" }, { key: "robots", label: "Search engines", type: "select", choices: ROBOTS_OPTIONS, help: "Leave on the default unless the page should be hidden from search results." }] },
  { key: "site-settings", label: "Site Settings", table: "site_settings", group: "settings", fields: [{ key: "site_name", label: "Site name", required: true, help: "Used in the browser tab, the footer and the structured data." }, { key: "tagline", label: "Tagline" }, { key: "description", label: "Description", type: "textarea", help: "The home page meta description and the site-wide fallback." }, { key: "is_active", label: "Active", type: "checkbox", help: "Only one row should be active; it is the one the site reads." }] },
];
// A20: /admin/menu-categories and /admin/menu-items used to be generic
// resources that wrote menu_categories / menu_items straight from the shared
// form. That bypassed the dedicated manager’s delete protection and its
// parseIdr price parsing, so prices could land in the column unnormalised.
// The keys are gone; the route redirects them to the real manager.
export const retiredResourceRedirects: Record<string, string> = { "menu-categories": "/admin/menu", "menu-items": "/admin/menu" };

export function resourceFor(key: string) { return resources.find((resource) => resource.key === key); }

// A9: settings-class resources (site settings, SEO, navigation, social links,
// contact information) are site-wide configuration rather than day-to-day
// content, so they require `admin`; ordinary content resources stay open to
// `editor`. Mirrors the tightened `cms_manage` DB policy in
// 20260921000300_split_editor_admin_on_settings.sql — the policy is the real
// boundary, this is defense in depth and produces a clearer failure than an
// RLS rejection.
export function minRoleFor(resource: Resource) { return resource.group === "settings" ? "admin" as const : "editor" as const; }
