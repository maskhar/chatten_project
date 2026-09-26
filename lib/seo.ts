import type { Metadata } from "next";
import { mediaHrefById } from "@/lib/media/url";

export type SeoOverride = { title: string | null; description: string | null; canonical_url: string | null; og_media_id: string | null; robots: string | null };

const SITE_NAME = "Chatten Cafe";

// A104: judul halaman diberi sufiks nama situs, tetapi beranda memakai nama
// situs itu sendiri sebagai judulnya — tanpa penjagaan ini hasilnya
// "Chatten Cafe | Chatten Cafe". Dipusatkan di sini supaya setiap pemanggil
// mendapat aturan yang sama, termasuk jalur penimpa `seo_settings`.
export function pageTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return SITE_NAME;
  return trimmed === SITE_NAME ? SITE_NAME : `${trimmed} | ${SITE_NAME}`;
}

export function publicMetadata(title: string, description: string, path: string): Metadata { const base = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined; const full = pageTitle(title); return { title: full, description, metadataBase: base, alternates: base ? { canonical: new URL(path, base).toString() } : undefined, openGraph: { title: full, description, type: "website", url: base ? new URL(path, base).toString() : undefined } }; }

// A28: seo_settings has had og_media_id, title, description, canonical_url and
// robots since the initial migration, and the CMS can now edit them, but
// nothing read them — so the fields looked editable and changed nothing.
// The CMS row wins where it is filled in; a blank column falls back to the
// page's own defaults rather than blanking the tag.
export function applySeoOverride(base: Metadata, override: SeoOverride | null | undefined, path: string): Metadata {
  if (!override) return base;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined;
  const title = override.title?.trim() ? pageTitle(override.title) : base.title;
  const description = override.description?.trim() || base.description;
  const canonical = override.canonical_url?.trim() || (appUrl ? new URL(path, appUrl).toString() : undefined);
  // A6 routes media through /api/media/<id>, which is relative; Open Graph
  // consumers are off-site, so it has to be absolutised against the app URL or
  // the tag is unusable.
  const ogPath = mediaHrefById(override.og_media_id);
  const ogImage = ogPath && appUrl ? new URL(ogPath, appUrl).toString() : undefined;

  return {
    ...base,
    title,
    description,
    alternates: canonical ? { canonical } : base.alternates,
    robots: override.robots?.trim() || base.robots,
    openGraph: {
      ...base.openGraph,
      title: typeof title === "string" ? title : undefined,
      description: typeof description === "string" ? description : undefined,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}
