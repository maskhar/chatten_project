import type { MetadataRoute } from "next";
import { publicCards, publicEvents } from "@/lib/public-data/queries";

const paths = ["/", "/menu", "/experience", "/spaces", "/gallery", "/events", "/about", "/visit"];

// A104: sitemap hanya memuat delapan path statis, padahal `/spaces/[slug]`,
// `/experience/[slug]` dan `/events/[slug]` punya `generateMetadata` sendiri —
// halaman-halaman itu memang dimaksudkan untuk diindeks, tetapi tidak pernah
// diumumkan. Saat pemeriksaan ini, 4 space dan 4 experience terbitan luput.
//
// Pembacaan datanya memakai helper `publicCards`/`publicEvents` yang sudah
// dibungkus `guard` (A39): sebuah gangguan basis data menghasilkan sitemap
// berisi path statis saja, bukan route yang melempar. Sitemap yang gagal lebih
// buruk daripada sitemap yang pendek — pengayak menandainya rusak.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return [];

  const [spaces, experiences, events] = await Promise.all([
    publicCards("spaces"),
    publicCards("experiences"),
    publicEvents(),
  ]);

  const dynamicPaths = [
    ...spaces.map((row) => `/spaces/${row.slug}`),
    ...experiences.map((row) => `/experience/${row.slug}`),
    ...events.map((row) => `/events/${row.slug}`),
  ].filter((path) => !path.endsWith("/"));

  const lastModified = new Date();
  return [...paths, ...dynamicPaths].map((path) => ({
    url: new URL(path, base).toString(),
    lastModified,
  }));
}
