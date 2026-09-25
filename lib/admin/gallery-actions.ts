"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyOrder } from "@/lib/admin/reorder";
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

export async function reorderGalleryItems(ids: string[]) {
  await requireAdmin();
  if (!ids.length) throw new Error("Urutan Gallery tidak diterima. Muat ulang halaman lalu coba lagi.");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("gallery_items").select("id").in("id", ids);
  if (error) throw new Error("Data Gallery untuk pengurutan tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  if (data.length !== ids.length) throw new Error("Salah satu item Gallery yang diurutkan sudah tidak ada. Muat ulang halaman untuk melihat daftar terbaru.");
  await applyOrder("gallery_items", ids, 0, "urutan Gallery");
  refreshGallery();
}

// Alt text is optional: an operator who leaves it blank gets the caption, and
// failing that the media row's own alt text, rather than a rejected save. The
// image itself is still required — a gallery tile with no image is nothing.
export async function saveGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID item Gallery");
  const title = parseOptionalText(formData.get("title"), "Keterangan Gallery");
  const imageMediaId = parseUuid(formData.get("image_media_id"), "Gambar Gallery");
  const payload = {
    title,
    alt_text: parseOptionalText(formData.get("alt_text"), "Teks alternatif") ?? title,
    image_media_id: imageMediaId,
    is_active: parseCheckbox(formData.get("is_active"), "Status tampil Gallery"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status item Gallery" }),
  };
  const supabase = await createServerSupabaseClient();
  const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
  if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Item Gallery belum disimpan.");
  if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Media Library. Pilih gambar lain.");
  if (id) {
    const { error, count } = await supabase.from("gallery_items").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Item Gallery gagal disimpan.");
    assertAffectedRows(count, 1, "Item Gallery tidak ditemukan atau tidak boleh diubah.");
  } else {
    const latest = await supabase
      .from("gallery_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("Urutan Gallery tidak dapat dibaca. Item Gallery belum disimpan.");
    const sortOrder = Number(latest.data?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("gallery_items").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Item Gallery gagal dibuat.");
  }
  refreshGallery();
}

export async function deleteGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item Gallery");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("gallery_items").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Item Gallery gagal dihapus.");
  assertAffectedRows(count, 1, "Item Gallery tidak ditemukan atau tidak boleh dihapus.");
  refreshGallery();
}

export async function toggleGalleryItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item Gallery");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil Gallery");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("gallery_items").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Status tampil item Gallery gagal diperbarui.");
  assertAffectedRows(count, 1, "Item Gallery tidak ditemukan atau tidak boleh diubah.");
  refreshGallery();
}
