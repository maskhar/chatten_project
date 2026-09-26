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
  parseOptionalUuid,
  parseRequiredText,
  parseSlug,
  parseStatus,
  parseUuid,
} from "@/lib/admin/form-schema";

function refresh() {
  revalidatePath("/admin/experiences");
  revalidatePath("/experience");
  revalidatePath("/");
}

export async function saveExperience(formData: FormData) {
  await requireAdmin();

  const id = parseOptionalUuid(formData.get("id"), "ID pengalaman");
  const name = parseRequiredText(formData.get("name"), "Nama pengalaman");
  // experiences.description is `not null`, unlike spaces.description.
  const description = parseRequiredText(formData.get("description"), "Deskripsi pengalaman");
  const slug = parseSlug(formData.get("slug"), name, "Slug pengalaman");
  const imageMediaId = parseOptionalUuid(formData.get("image_media_id"), "ID gambar pengalaman");

  const payload = {
    name,
    slug,
    description,
    image_media_id: imageMediaId,
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif pengalaman"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status pengalaman" }),
  };

  const supabase = await createServerSupabaseClient();

  if (imageMediaId) {
    const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
    if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Pengalaman belum disimpan.");
    if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Pustaka Media. Pilih gambar lain.");
  }

  if (id) {
    const { error, count } = await supabase.from("experiences").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Pengalaman gagal disimpan.");
    assertAffectedRows(count, 1, "Pengalaman tidak ditemukan atau tidak boleh diubah.");
  } else {
    const latest = await supabase
      .from("experiences")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("Urutan pengalaman tidak dapat dibaca. Pengalaman belum dibuat.");
    const sortOrder = Number(latest.data?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("experiences").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Pengalaman gagal dibuat.");
  }

  refresh();
}

export async function reorderExperiences(ids: string[]) {
  await requireAdmin();

  // The submitted list used to go straight to applyOrder, so a partial list
  // renumbered a subset and left the rest colliding at their old ranks. Spaces
  // already required the complete set; experiences now match.
  if (!ids.length) throw new Error("Urutan pengalaman tidak diterima. Muat ulang halaman lalu coba lagi.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("experiences").select("id");
  if (error) throw new Error("Daftar pengalaman tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  const existingIds = data.map((row) => String(row.id));
  if (!isCompleteReorderSet(ids, existingIds)) {
    throw new Error("Urutan pengalaman harus memuat setiap pengalaman tepat satu kali.");
  }

  await applyOrder("experiences", ids, 0, "urutan pengalaman");
  refresh();
}

export async function setExperienceActive(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID pengalaman");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil pengalaman");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase
    .from("experiences")
    .update({ is_active: active }, { count: "exact" })
    .eq("id", id);
  if (error) throw new Error("Status tampil pengalaman gagal diperbarui.");
  assertAffectedRows(count, 1, "Pengalaman tidak ditemukan atau tidak boleh diubah.");
  refresh();
}

export async function deleteExperience(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID pengalaman");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("experiences").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Pengalaman gagal dihapus.");
  assertAffectedRows(count, 1, "Pengalaman tidak ditemukan atau tidak boleh dihapus.");
  refresh();
}
