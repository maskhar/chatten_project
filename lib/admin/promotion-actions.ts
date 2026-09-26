"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAffectedRows,
  assertRange,
  parseBooleanFlag,
  parseCheckbox,
  parseOptionalText,
  parseOptionalUuid,
  parseRequiredText,
  parseSlug,
  parseStatus,
  parseTimestamp,
  parseUuid,
} from "@/lib/admin/form-schema";

function refresh() {
  revalidatePath("/admin/promotions");
  revalidatePath("/");
}

export async function savePromotion(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID promo");
  const title = parseRequiredText(formData.get("title"), "Judul promo");
  const slug = parseSlug(formData.get("slug"), title, "Slug promo");
  // Both promotion dates are nullable, unlike events; the table's CHECK still
  // demands ends_at >= starts_at whenever both are present.
  const startsAt = parseTimestamp(formData.get("starts_at"), "Waktu mulai promo");
  const endsAt = parseTimestamp(formData.get("ends_at"), "Waktu selesai promo");
  assertRange(startsAt, endsAt, "promo");
  const imageMediaId = parseOptionalUuid(formData.get("image_media_id"), "ID gambar promo");
  const payload = {
    title,
    slug,
    summary: parseOptionalText(formData.get("summary"), "Ringkasan promo"),
    body: parseOptionalText(formData.get("body"), "Isi promo"),
    image_media_id: imageMediaId,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif promo"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status promo" }),
  };
  const supabase = await createServerSupabaseClient();
  if (imageMediaId) {
    const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
    if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Promo belum disimpan.");
    if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Pustaka Media. Pilih gambar lain.");
  }
  if (id) {
    const { error, count } = await supabase.from("promotions").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Promo gagal disimpan.");
    assertAffectedRows(count, 1, "Promo tidak ditemukan atau tidak boleh diubah.");
  } else {
    const { error } = await supabase.from("promotions").insert(payload);
    if (error) throw new Error("Promo gagal dibuat.");
  }
  refresh();
  redirect("/admin/promotions?saved=1");
}

export async function setPromotionActive(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID promo");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil promo");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("promotions").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Status tampil promo gagal diperbarui.");
  assertAffectedRows(count, 1, "Promo tidak ditemukan atau tidak boleh diubah.");
  refresh();
}

export async function deletePromotion(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID promo");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("promotions").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Promo gagal dihapus.");
  assertAffectedRows(count, 1, "Promo tidak ditemukan atau tidak boleh dihapus.");
  refresh();
}
