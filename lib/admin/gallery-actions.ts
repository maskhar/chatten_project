"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyOrder } from "@/lib/admin/reorder";
import { isCompleteReorderSet } from "@/lib/admin/reorder-core";
import {
  assertAffectedRows,
  parseBooleanFlag,
  parseCheckbox,
  parseOptionalText,
  parseStatus,
  parseUuid,
  parseOptionalUuid,
} from "@/lib/admin/form-schema";

function refreshGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
}

// The submitted list must be the complete current set, not merely a list of ids
// that all exist. applyOrder renumbers from rank 0, so a partial list renumbers
// the submitted subset and leaves every omitted row parked at its old rank —
// duplicate ranks the database cannot catch, because gallery_items has no unique
// constraint on sort_order (see 20260921000700_batch_reorder.sql). Spaces,
// experiences and homepage sections already required the full set.
export async function reorderGalleryItems(ids: string[]) {
  await requireAdmin();
  if (!ids.length) throw new Error("Urutan galeri tidak diterima. Muat ulang halaman lalu coba lagi.");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("gallery_items").select("id");
  if (error) throw new Error("Data galeri untuk pengurutan tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  const existingIds = data.map((row) => String(row.id));
  if (!isCompleteReorderSet(ids, existingIds)) {
    throw new Error("Urutan galeri harus memuat setiap item galeri tepat satu kali.");
  }
  await applyOrder("gallery_items", ids, 0, "urutan galeri");
  refreshGallery();
}

// Alt text is optional: an operator who leaves it blank gets the caption, and
// failing that the media row's own alt text, rather than a rejected save. The
// image itself is still required — a gallery tile with no image is nothing.
export async function saveGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID item galeri");
  const title = parseOptionalText(formData.get("title"), "Keterangan galeri");
  const imageMediaId = parseUuid(formData.get("image_media_id"), "Gambar galeri");
  const payload = {
    title,
    alt_text: parseOptionalText(formData.get("alt_text"), "Teks alternatif") ?? title,
    image_media_id: imageMediaId,
    is_active: parseCheckbox(formData.get("is_active"), "Status tampil galeri"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status item galeri" }),
  };
  const supabase = await createServerSupabaseClient();
  const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
  if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Item galeri belum disimpan.");
  if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Pustaka Media. Pilih gambar lain.");
  if (id) {
    const { error, count } = await supabase.from("gallery_items").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Item galeri gagal disimpan.");
    assertAffectedRows(count, 1, "Item galeri tidak ditemukan atau tidak boleh diubah.");
  } else {
    const latest = await supabase
      .from("gallery_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("Urutan galeri tidak dapat dibaca. Item galeri belum disimpan.");
    const sortOrder = Number(latest.data?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("gallery_items").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Item galeri gagal dibuat.");
  }
  refreshGallery();
}

export async function deleteGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item galeri");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("gallery_items").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Item galeri gagal dihapus.");
  assertAffectedRows(count, 1, "Item galeri tidak ditemukan atau tidak boleh dihapus.");
  refreshGallery();
}

export async function toggleGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item galeri");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil galeri");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("gallery_items").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Status tampil item galeri gagal diperbarui.");
  assertAffectedRows(count, 1, "Item galeri tidak ditemukan atau tidak boleh diubah.");
  refreshGallery();
}
