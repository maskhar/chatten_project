import type { TableName } from "@/types/tables";

export type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "checkbox" | "datetime-local" | "time" | "select" | "media"; options?: string[]; required?: boolean };
// `table` is the CMS write allowlist: a server action resolves a resource key
// to this value and writes to it. Typing it as TableName means a typo, or a
// table that no longer exists, is a build error rather than a runtime failure
// inside an authenticated mutation.
export type Resource = { key: string; label: string; table: TableName; group?: "website" | "content" | "settings"; description?: string; primaryKey?: string; fields: Field[] };
const editorial = [{ key: "sort_order", label: "Sort order", type: "number" as const }, { key: "is_active", label: "Active", type: "checkbox" as const }, { key: "status", label: "Status", type: "select" as const, options: ["draft", "published"] }];
export const resources: Resource[] = [
  { key: "hero", label: "Hero", table: "hero_slides", fields: [{ key: "title", label: "Title", required: true }, { key: "subtitle", label: "Subtitle", type: "textarea" }, { key: "cta_label", label: "CTA label" }, { key: "cta_url", label: "CTA URL" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "moments", label: "Chatten Moments", table: "moments", fields: [{ key: "name", label: "Name", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "about", label: "About", table: "about_sections", fields: [{ key: "title", label: "Title", required: true }, { key: "body", label: "Body", type: "textarea", required: true }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "experiences", label: "Experiences", table: "experiences", fields: [{ key: "name", label: "Name", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Description", type: "textarea", required: true }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "spaces", label: "Spaces", table: "spaces", fields: [{ key: "name", label: "Name", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "gallery", label: "Gallery", table: "gallery_items", fields: [{ key: "title", label: "Title" }, { key: "alt_text", label: "Alt text", required: true }, { key: "image_media_id", label: "Image", type: "media" }, ...editorial] },
  { key: "testimonials", label: "Testimonials", table: "testimonials", fields: [{ key: "author_name", label: "Author", required: true }, { key: "quote", label: "Quote", type: "textarea", required: true }, { key: "source", label: "Source" }, ...editorial] },
  { key: "promotions", label: "Promotions", table: "promotions", fields: [{ key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Summary", type: "textarea" }, { key: "body", label: "Body", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, { key: "starts_at", label: "Starts", type: "datetime-local" }, { key: "ends_at", label: "Ends", type: "datetime-local" }, ...editorial] },
  { key: "events", label: "Events", table: "events", fields: [{ key: "title", label: "Title", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Summary", type: "textarea" }, { key: "body", label: "Body", type: "textarea" }, { key: "image_media_id", label: "Image", type: "media" }, { key: "starts_at", label: "Starts", type: "datetime-local", required: true }, { key: "ends_at", label: "Ends", type: "datetime-local" }, ...editorial] },
  { key: "opening-hours", label: "Opening Hours", table: "opening_hours", fields: [{ key: "day_of_week", label: "Day (0 Sunday)", type: "number", required: true }, { key: "opens_at", label: "Opens", type: "time" }, { key: "closes_at", label: "Closes", type: "time" }, { key: "is_closed", label: "Closed", type: "checkbox" }, { key: "sort_order", label: "Sort order", type: "number" }] },
  { key: "contact", label: "Contact", table: "contact_information", group: "settings", fields: [{ key: "address", label: "Address", type: "textarea" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "whatsapp_url", label: "WhatsApp URL" }, { key: "directions_url", label: "Directions URL" }, { key: "map_embed_url", label: "Map embed URL" }, { key: "is_active", label: "Active", type: "checkbox" }] },
  { key: "social", label: "Social Media", table: "social_links", group: "settings", fields: [{ key: "platform", label: "Platform", required: true }, { key: "label", label: "Label" }, { key: "url", label: "URL", required: true }, { key: "sort_order", label: "Sort order", type: "number" }, { key: "is_active", label: "Active", type: "checkbox" }] },
  { key: "navigation", label: "Navigation", table: "navigation_items", group: "settings", fields: [{ key: "label", label: "Label", required: true }, { key: "href", label: "URL path", required: true }, { key: "sort_order", label: "Sort order", type: "number" }, { key: "is_active", label: "Active", type: "checkbox" }] },
  { key: "seo", label: "SEO", table: "seo_settings", group: "settings", fields: [{ key: "page_key", label: "Page key", required: true }, { key: "title", label: "SEO title" }, { key: "description", label: "SEO description", type: "textarea" }, { key: "canonical_url", label: "Canonical URL" }, { key: "og_media_id", label: "Social share image", type: "media" }, { key: "robots", label: "Robots" }] },
  { key: "site-settings", label: "Site Settings", table: "site_settings", group: "settings", fields: [{ key: "site_name", label: "Site name", required: true }, { key: "tagline", label: "Tagline" }, { key: "description", label: "Description", type: "textarea" }, { key: "is_active", label: "Active", type: "checkbox" }] },
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
