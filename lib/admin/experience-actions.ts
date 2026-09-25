"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyOrder } from "@/lib/admin/reorder";
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

  const id = parseOptionalUuid(formData.get("id"), "ID experience");
  const name = parseRequiredText(formData.get("name"), "Nama experience");
  // experiences.description is `not null`, unlike spaces.description.
  const description = parseRequiredText(formData.get("description"), "Deskripsi experience");
  const slug = parseSlug(formData.get("slug"), name, "Slug experience");
  const imageMediaId = parseOptionalUuid(formData.get("image_media_id"), "ID gambar experience");

  const payload = {
    name,
    slug,
    description,
    image_media_id: imageMediaId,
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif experience"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status experience" }),
  };

  const supabase = await createServerSupabaseClient();

  if (imageMediaId) {
    const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
    if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Experience belum disimpan.");
    if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Media Library. Pilih gambar lain.");
  }

  if (id) {
    const { error, count } = await supabase.from("experiences").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Experience gagal disimpan.");
    assertAffectedRows(count, 1, "Experience tidak ditemukan atau tidak boleh diubah.");
  } else {
    const latest = await supabase
      .from("experiences")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("Urutan experience tidak dapat dibaca. Experience belum dibuat.");
    const sortOrder = Number(latest.data?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("experiences").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Experience gagal dibuat.");
  }

  refresh();
}

export async function reorderExperiences(ids: string[]) {
  await requireAdmin();

  // The submitted list used to go straight to applyOrder, so a partial list
  // renumbered a subset and left the rest colliding at their old ranks. Spaces
  // already required the complete set; experiences now match.
  if (!ids.length) throw new Error("Urutan experience tidak diterima. Muat ulang halaman lalu coba lagi.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("experiences").select("id");
  if (error) throw new Error("Daftar experience tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  const existingIds = data.map((row) => String(row.id));
  if (existingIds.length !== ids.length || existingIds.some((existing) => !ids.includes(existing))) {
    throw new Error("Urutan experience harus memuat setiap experience tepat satu kali.");
  }

  await applyOrder("experiences", ids, 0, "urutan experience");
  refresh();
}

export async function setExperienceActive(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID experience");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil experience");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase
    .from("experiences")
    .update({ is_active: active }, { count: "exact" })
    .eq("id", id);
  if (error) throw new Error("Status tampil experience gagal diperbarui.");
  assertAffectedRows(count, 1, "Experience tidak ditemukan atau tidak boleh diubah.");
  refresh();
}

export async function deleteExperience(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID experience");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("experiences").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Experience gagal dihapus.");
  assertAffectedRows(count, 1, "Experience tidak ditemukan atau tidak boleh dihapus.");
  refresh();
}
