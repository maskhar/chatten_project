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
// Events and promotions are ordered by date, not by hand: migration
// 20260910000200_remove_event_promotion_manual_ordering.sql dropped their
// sort_order column. Declaring the field anyway made saveResource build a
// payload with a column that no longer exists — latent only because the
// bespoke /admin/events and /admin/promotions routes shadow the generic one.
const dated = [{ key: "is_active", label: "Aktif", type: "checkbox" as const }, { key: "status", label: "Status", type: "select" as const, options: ["draft", "published"] }];
const editorial = [{ key: "sort_order", label: "Urutan tampil", type: "number" as const }, ...dated];
export const resources: Resource[] = [
  { key: "hero", label: "Hero", table: "hero_slides", fields: [{ key: "title", label: "Judul", required: true }, { key: "subtitle", label: "Subjudul", type: "textarea" }, { key: "cta_label", label: "Label tombol CTA" }, { key: "cta_url", label: "URL tombol CTA" }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "moments", label: "Momen Chatten", table: "moments", fields: [{ key: "name", label: "Nama", required: true }, { key: "description", label: "Deskripsi", type: "textarea" }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "about", label: "Tentang", table: "about_sections", description: "Blok cerita di halaman /about, ditampilkan sesuai urutan tampil.", fields: [{ key: "title", label: "Judul", required: true }, { key: "body", label: "Isi", type: "textarea", required: true, help: "Satu bagian cerita. Tambahkan beberapa baris daripada satu blok panjang." }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "experiences", label: "Pengalaman", table: "experiences", fields: [{ key: "name", label: "Nama", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Deskripsi", type: "textarea", required: true }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "spaces", label: "Ruang", table: "spaces", fields: [{ key: "name", label: "Nama", required: true }, { key: "slug", label: "Slug", required: true }, { key: "description", label: "Deskripsi", type: "textarea" }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "gallery", label: "Galeri", table: "gallery_items", fields: [{ key: "title", label: "Judul" }, { key: "alt_text", label: "Teks alt", help: "Opsional. Menjelaskan gambar untuk pembaca layar dan mesin pencari; bila kosong, judul yang dipakai." }, { key: "image_media_id", label: "Gambar", type: "media" }, ...editorial] },
  { key: "testimonials", label: "Testimoni", table: "testimonials", description: "Kutipan tamu. Hanya baris yang terbit dan aktif yang tampil di situs.", fields: [{ key: "author_name", label: "Penulis", required: true, help: "Nama yang tampil di bawah kutipan." }, { key: "quote", label: "Kutipan", type: "textarea", required: true }, { key: "source", label: "Sumber", help: "Opsional. Asal kutipan, mis. ulasan Google." }, ...editorial] },
  { key: "promotions", label: "Promosi", table: "promotions", fields: [{ key: "title", label: "Judul", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Ringkasan", type: "textarea" }, { key: "body", label: "Isi", type: "textarea" }, { key: "image_media_id", label: "Gambar", type: "media" }, { key: "starts_at", label: "Mulai", type: "datetime-local" }, { key: "ends_at", label: "Selesai", type: "datetime-local" }, ...dated] },
  { key: "events", label: "Acara", table: "events", fields: [{ key: "title", label: "Judul", required: true }, { key: "slug", label: "Slug", required: true }, { key: "summary", label: "Ringkasan", type: "textarea" }, { key: "body", label: "Isi", type: "textarea" }, { key: "image_media_id", label: "Gambar", type: "media" }, { key: "starts_at", label: "Mulai", type: "datetime-local", required: true }, { key: "ends_at", label: "Selesai", type: "datetime-local" }, ...dated] },
  { key: "opening-hours", label: "Jam Buka", table: "opening_hours", fields: [{ key: "day_of_week", label: "Hari", type: "select", choices: DAY_OPTIONS, required: true, help: "Satu baris untuk tiap hari. Hari tanpa baris tidak ditampilkan." }, { key: "opens_at", label: "Buka", type: "time", help: "Kosongkan kedua jam bila hari itu ditandai tutup." }, { key: "closes_at", label: "Tutup", type: "time", help: "Harus lebih lambat daripada jam buka." }, { key: "is_closed", label: "Tutup seharian", type: "checkbox" }, { key: "sort_order", label: "Urutan tampil", type: "number", help: "Hanya berpengaruh bila satu hari punya beberapa baris, mis. jeda makan siang. Beri nomor 0, 1, 2 dalam hari itu — nomornya harus unik per hari." }] },
  { key: "contact", label: "Kontak", table: "contact_information", group: "settings", fields: [{ key: "address", label: "Alamat", type: "textarea", help: "Tampil di halaman /visit dan pada structured data bisnis." }, { key: "phone", label: "Telepon", help: "Sertakan kode negara, mis. +62 812 0000 0000." }, { key: "email", label: "Email" }, { key: "whatsapp_url", label: "URL WhatsApp", help: "Tautan https://wa.me/ lengkap, bukan hanya nomornya." }, { key: "directions_url", label: "URL petunjuk arah", help: "Tautan Google Maps di balik tombol petunjuk arah." }, { key: "map_embed_url", label: "URL sematan peta", help: "Alamat sematan https:// dari penyedia peta yang didukung." }, { key: "is_active", label: "Aktif", type: "checkbox", help: "Hanya satu baris yang boleh aktif; baris itulah yang dibaca situs." }] },
  { key: "social", label: "Media Sosial", table: "social_links", group: "settings", fields: [{ key: "platform", label: "Platform", type: "select", choices: SOCIAL_PLATFORM_OPTIONS, required: true, help: "Jaringan tujuan tautan ini. Dipakai sebagai kunci, jadi ejaannya penting." }, { key: "label", label: "Label", help: "Opsional. Menimpa nama platform di footer." }, { key: "url", label: "URL", required: true, help: "Alamat https:// lengkap dari profil." }, { key: "sort_order", label: "Urutan tampil", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
  { key: "navigation", label: "Navigasi", table: "navigation_items", group: "settings", fields: [{ key: "label", label: "Label", required: true, help: "Teks yang tampil di header." }, { key: "href", label: "Halaman", type: "select", choices: NAVIGATION_ROUTE_OPTIONS, required: true, help: "Hanya halaman publik yang tersedia yang ditawarkan; salah ketik di sini berarti tautan header menuju 404." }, { key: "sort_order", label: "Urutan tampil", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
  { key: "seo", label: "SEO", table: "seo_settings", group: "settings", fields: [{ key: "page_key", label: "Halaman", type: "select", choices: SEO_PAGE_KEY_OPTIONS, required: true, help: "Satu baris per halaman. Judul beranda diambil dari Pengaturan Situs." }, { key: "title", label: "Judul SEO", help: "Bila kosong, judul bawaan halaman yang dipakai." }, { key: "description", label: "Deskripsi SEO", type: "textarea", help: "Sekitar 150–160 karakter. Bila kosong, deskripsi bawaan halaman yang dipakai." }, { key: "canonical_url", label: "URL kanonis", help: "Isi hanya bila halaman ini menduplikasi alamat lain." }, { key: "og_media_id", label: "Gambar bagikan sosial", type: "media" }, { key: "robots", label: "Mesin pencari", type: "select", choices: ROBOTS_OPTIONS, help: "Biarkan pada pilihan bawaan kecuali halaman ini harus disembunyikan dari hasil pencarian." }] },
  { key: "site-settings", label: "Pengaturan Situs", table: "site_settings", group: "settings", fields: [{ key: "site_name", label: "Nama situs", required: true, help: "Dipakai di tab browser, footer, dan structured data." }, { key: "tagline", label: "Tagline" }, { key: "description", label: "Deskripsi", type: "textarea", help: "Meta description beranda sekaligus cadangan untuk seluruh situs." }, { key: "is_active", label: "Aktif", type: "checkbox", help: "Hanya satu baris yang boleh aktif; baris itulah yang dibaca situs." }] },
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
