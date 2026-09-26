import type { PublicMedia } from "./types";
import { mediaHref } from "@/lib/media/url";

// A93: satu-satunya daftar kolom media yang boleh dibaca permukaan publik.
//
// `select("*")` dulu dipakai di ketiga kueri media publik, dan sejak
// 20260927000100_media_read_exposure.sql itu akan gagal sebagai `anon`: hak
// SELECT peran itu kini per kolom, karena RLS menyaring baris dan tidak dapat
// menyembunyikan kolom. Enam kolom ini adalah seluruh yang dirender —
// `id` untuk /api/media/[id], `alt_text` untuk teks alternatif,
// `width`/`height` untuk rasio, `focal_x`/`focal_y` untuk titik fokus crop.
//
// Menyebutkannya juga membuat batas itu terbaca di kode: menambah kolom di
// sini tanpa menambah `grant select (...)` pada migrasi berarti halaman publik
// mengembalikan galat, bukan membocorkan kolom.
export const PUBLIC_MEDIA_COLUMNS = "id,alt_text,width,height,focal_x,focal_y";

// A6: addressed by id on this origin, served by app/api/media/[id]/route.ts.
export function mediaUrl(media: PublicMedia | undefined) {
  return mediaHref(media);
}

export function mediaMap(rows: unknown[]) {
  return Object.fromEntries((rows as PublicMedia[]).map((row) => [row.id, row]));
}
