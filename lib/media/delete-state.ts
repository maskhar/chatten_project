import { buildMediaUsagePresentation } from "./usage-presentation";
import type { MediaUsageReference } from "./usage";

export type MediaDeleteState = {
  canDelete: boolean;
  usageCount: number;
  protectedMessage: string | null;
  confirmationMessage: string | null;
  references: readonly MediaUsageReference[];
};

// A91 (lanjutan). Hapus media punya tiga hasil akhir yang berbeda, bukan dua:
// benar-benar terhapus, ditolak tanpa mengubah apa pun, dan — yang paling
// penting — catatan terhapus tetapi objeknya tertinggal di Storage sebagai
// berkas yatim. Ketiganya sebelumnya dipetakan ke `status: "error"` yang sama,
// sehingga satu-satunya beda antara "tidak ada yang berubah" dan "berkas
// tertinggal dan perlu dibersihkan administrator" hanyalah bunyi kalimatnya.
//
// `MEDIA_DELETE_ORPHANED` memisahkannya: ia terminal (tombol hapus tidak boleh
// muncul lagi, karena barisnya memang sudah hilang), dan ia membawa jalur objek
// yang harus dibersihkan.
export type MediaDeleteActionCode = "MEDIA_IN_USE" | "MEDIA_DELETE_FAILED" | "MEDIA_DELETE_ORPHANED";

export type MediaDeleteActionState = {
  status: "idle" | "success" | "error";
  code?: MediaDeleteActionCode;
  message?: string;
  references?: readonly MediaUsageReference[];
};

export const initialMediaDeleteActionState: MediaDeleteActionState = { status: "idle" };

/**
 * True when the row no longer exists, so nothing is left to act on.
 *
 * A refusal (`MEDIA_IN_USE`) and a delete that changed nothing
 * (`MEDIA_DELETE_FAILED`) are both retryable and keep their control. A success
 * and an orphan are not: offering "Hapus dengan aman" again on a row that is
 * already gone can only produce a second, misleading error.
 */
export function isMediaDeleteSettled(state: MediaDeleteActionState): boolean {
  return state.status === "success" || state.code === "MEDIA_DELETE_ORPHANED";
}

/**
 * A94: benarkah penolakan ini datang dari trigger penjaga di basis data?
 *
 * `20260927000200_media_delete_guard.sql` menolak DELETE pada media yang masih
 * dirujuk konten, dengan errcode 23503 dan hint `MEDIA_IN_USE`. Tanpa
 * pemeriksaan ini, penolakan itu jatuh ke pesan generik "tidak ada yang
 * dihapus" — benar secara teknis, tetapi tidak menyebutkan satu-satunya hal
 * yang dapat dilakukan operator, yaitu melepas rujukannya lebih dulu.
 *
 * Jalur normalnya tetap pemeriksaan di aplikasi, yang dapat menamai konten
 * yang memakai gambar itu. Trigger menangkap dua kasus yang tidak dapat
 * ditutup di sana: permintaan PostgREST langsung dengan token sesi CMS, dan
 * balapan di mana baris konten baru menunjuk gambar itu setelah peta
 * penggunaan dibaca.
 */
export function isMediaInUseDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const shape = error as { code?: unknown; hint?: unknown; message?: unknown };
  if (shape.hint === "MEDIA_IN_USE") return true;
  // PostgREST meneruskan errcode apa adanya, tetapi tidak selalu meneruskan
  // hint. Pasangan kode + teks pesan trigger adalah cadangannya.
  return shape.code === "23503" && /referenced by \d+ content row/.test(String(shape.message ?? ""));
}

export function mediaOrphanActionState(storagePath: string): MediaDeleteActionState {
  return {
    status: "error",
    code: "MEDIA_DELETE_ORPHANED",
    message:
      "Catatan gambar sudah dihapus dari Pustaka Media, tetapi berkasnya masih tertinggal di Storage sebagai berkas yatim: " +
      storagePath +
      ". Minta administrator membersihkannya, lalu muat ulang halaman ini.",
  };
}

export function buildMediaDeleteState(references: readonly MediaUsageReference[], mediaName: string): MediaDeleteState {
  const presentation = buildMediaUsagePresentation(references);
  const name = mediaName.trim() || "gambar ini";
  return {
    canDelete: presentation.count === 0,
    usageCount: presentation.count,
    protectedMessage: presentation.count ? "Gambar ini tidak dapat dihapus karena sedang dipakai di " + presentation.count + " tempat." : null,
    confirmationMessage: presentation.count ? null : "Hapus “" + name + "”? Gambar akan dihapus permanen dari Pustaka Media dan Storage.",
    references,
  };
}

export function mediaInUseActionState(references: readonly MediaUsageReference[]): MediaDeleteActionState {
  const state = buildMediaDeleteState(references, "gambar ini");
  return { status: "error", code: "MEDIA_IN_USE", message: state.protectedMessage ?? "Gambar ini tidak dapat dihapus.", references };
}
