"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyOrder } from "@/lib/admin/reorder";
import {
  assertAffectedRows,
  parseBooleanFlag,
  parseCheckbox,
  parseOptionalText,
  parseOptionalUuid,
  parseRequiredText,
  parseSlug,
  parseStatus,
  parseUuid,
} from "@/lib/admin/form-schema";

function refresh() {
  revalidatePath("/admin/spaces");
  revalidatePath("/spaces");
  revalidatePath("/");
}

export async function saveSpace(formData: FormData) {
  await requireAdmin();

  const id = parseOptionalUuid(formData.get("id"), "ID space");
  const name = parseRequiredText(formData.get("name"), "Nama space");
  const slug = parseSlug(formData.get("slug"), name, "Slug space");
  const imageMediaId = parseOptionalUuid(formData.get("image_media_id"), "ID gambar space");

  const payload = {
    name,
    slug,
    description: parseOptionalText(formData.get("description"), "Deskripsi space"),
    image_media_id: imageMediaId,
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif space"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status space" }),
  };

  const supabase = await createServerSupabaseClient();

  if (imageMediaId) {
    const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
    if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Space belum disimpan.");
    if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Media Library. Pilih gambar lain.");
  }

  if (id) {
    const { error, count } = await supabase.from("spaces").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Space gagal disimpan.");
    assertAffectedRows(count, 1, "Space tidak ditemukan atau tidak boleh diubah.");
  } else {
    const latest = await supabase
      .from("spaces")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("Urutan space tidak dapat dibaca. Space belum dibuat.");
    const sortOrder = Number(latest.data?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("spaces").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Space gagal dibuat.");
  }

  refresh();
  redirect("/admin/spaces?saved=1");
}

export async function reorderSpaces(ids: string[]) {
  await requireAdmin();

  // applyOrder revalidates the ids itself; this keeps the message specific.
  if (!ids.length) throw new Error("Urutan space tidak diterima. Muat ulang halaman lalu coba lagi.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("spaces").select("id");
  if (error) throw new Error("Daftar space tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  const existingIds = data.map((row) => String(row.id));
  if (existingIds.length !== ids.length || existingIds.some((existing) => !ids.includes(existing))) {
    throw new Error("Urutan space harus memuat setiap space tepat satu kali.");
  }

  await applyOrder("spaces", ids, 0, "urutan space");

  refresh();
}

export async function setSpaceActive(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID space");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil space");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("spaces").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Status tampil space gagal diperbarui.");
  assertAffectedRows(count, 1, "Space tidak ditemukan atau tidak boleh diubah.");
  refresh();
}

export async function deleteSpace(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID space");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("spaces").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Space gagal dihapus.");
  assertAffectedRows(count, 1, "Space tidak ditemukan atau tidak boleh dihapus.");

  const { data: remaining, error: remainingError } = await supabase
    .from("spaces")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (remainingError) throw new Error("Space terhapus, tetapi urutan gagal dirapikan.");

  // The row is already gone; a failure here leaves gaps in sort_order, which
  // renders fine, so the delete is not reported as failed.
  try {
    await applyOrder("spaces", remaining.map((row) => String(row.id)), 0, "urutan space");
  } catch {
    throw new Error("Space terhapus, tetapi urutan gagal dirapikan.");
  }

  refresh();
}
