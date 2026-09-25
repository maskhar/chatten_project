"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseIdr } from "@/lib/menu/price";
import { dynamicTable } from "@/lib/supabase/dynamic";
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

function refreshMenu(includeHome = false) {
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  if (includeHome) revalidatePath("/");
}

async function nextSortOrder(table: "menu_categories" | "menu_items", categoryId?: string) {
  const supabase = await createServerSupabaseClient();
  let query = dynamicTable(supabase, table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (table === "menu_items" && categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Urutan menu tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  const current = (data as { sort_order?: unknown } | null)?.sort_order;
  if (current !== undefined && current !== null && (!Number.isInteger(Number(current)) || Number(current) < 0)) {
    throw new Error("Urutan menu tersimpan tidak valid. Hubungi administrator.");
  }
  return Number(current ?? -1) + 1;
}

async function saveOrder(table: "menu_categories" | "menu_items", ids: string[], categoryId?: string) {
  await requireAdmin();
  if (!ids.length) throw new Error("Urutan menu tidak diterima. Muat ulang halaman lalu coba lagi.");
  const category = table === "menu_items" ? parseUuid(categoryId ?? null, "ID kategori") : null;
  const supabase = await createServerSupabaseClient();
  const query = table === "menu_items"
    ? supabase.from("menu_items").select("id").in("id", ids).eq("category_id", category!)
    : supabase.from("menu_categories").select("id").in("id", ids);
  const { data, error } = await query;
  if (error) throw new Error("Data menu untuk pengurutan tidak dapat dibaca. Muat ulang halaman lalu coba lagi.");
  if (data.length !== ids.length) throw new Error("Satu atau beberapa data menu sudah berubah. Muat ulang halaman lalu coba lagi.");
  await applyOrder(table, ids, 0, "urutan menu");
  refreshMenu(true);
}

export async function reorderMenuCategories(ids: string[]) {
  await saveOrder("menu_categories", ids);
}

export async function reorderMenuItems(categoryId: string, ids: string[]) {
  await saveOrder("menu_items", ids, categoryId);
}

export async function saveMenuCategory(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID kategori");
  const name = parseRequiredText(formData.get("name"), "Nama kategori");
  const slug = parseSlug(formData.get("slug"), name, "Slug kategori");
  const payload = {
    name,
    slug,
    description: parseOptionalText(formData.get("description"), "Deskripsi kategori"),
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif kategori"),
  };
  const supabase = await createServerSupabaseClient();
  if (id) {
    const { error, count } = await supabase.from("menu_categories").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Kategori menu gagal disimpan.");
    assertAffectedRows(count, 1, "Kategori menu tidak ditemukan atau tidak boleh diubah.");
  } else {
    const sortOrder = await nextSortOrder("menu_categories");
    const { error } = await supabase.from("menu_categories").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Kategori menu gagal dibuat.");
  }
  refreshMenu();
}

export async function deleteMenuCategory(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID kategori");
  const supabase = await createServerSupabaseClient();
  const lookup = await supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (lookup.error) throw new Error("Isi kategori tidak dapat diperiksa. Kategori belum dihapus.");
  if (lookup.count === null) throw new Error("Jumlah item kategori tidak dapat dipastikan. Kategori belum dihapus.");
  if (lookup.count > 0) throw new Error(`Pindahkan atau hapus ${lookup.count} item menu dalam kategori ini sebelum menghapusnya.`);
  const { error, count } = await supabase.from("menu_categories").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Kategori menu gagal dihapus.");
  assertAffectedRows(count, 1, "Kategori menu tidak ditemukan atau tidak boleh dihapus.");
  refreshMenu();
}

export async function saveMenuItem(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID item menu");
  const name = parseRequiredText(formData.get("name"), "Nama item menu");
  const categoryId = parseUuid(formData.get("category_id"), "ID kategori");
  const slug = parseSlug(formData.get("slug"), name, "Slug item menu");
  const rawPrice = typeof formData.get("price") === "string" ? String(formData.get("price")) : "";
  // parseIdr strips every non-digit so an operator can paste "Rp 25.000"; that
  // also strips a minus sign, so "-25000" would be saved as 25000 instead of
  // being refused by the `price >= 0` CHECK. Reject the sign before parsing.
  if (/-/.test(rawPrice)) throw new Error("Harga tidak boleh bernilai negatif.");
  const price = parseIdr(rawPrice);
  if (price === null) throw new Error("Harga wajib diisi dengan angka rupiah nol atau lebih.");
  const payload = {
    category_id: categoryId,
    name,
    slug,
    description: parseOptionalText(formData.get("description"), "Deskripsi item menu"),
    price,
    image_media_id: parseOptionalUuid(formData.get("image_media_id"), "ID gambar"),
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif item menu"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status item menu" }),
  };
  const supabase = await createServerSupabaseClient();
  const categoryLookup = await supabase.from("menu_categories").select("id").eq("id", categoryId).maybeSingle();
  if (categoryLookup.error) throw new Error("Kategori menu tidak dapat diperiksa. Item belum disimpan.");
  if (!categoryLookup.data) throw new Error("Kategori menu tidak ditemukan. Pilih kategori yang masih tersedia.");
  if (id) {
    const { error, count } = await supabase.from("menu_items").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Item menu gagal disimpan.");
    assertAffectedRows(count, 1, "Item menu tidak ditemukan atau tidak boleh diubah.");
  } else {
    const sortOrder = await nextSortOrder("menu_items", categoryId);
    const { error } = await supabase.from("menu_items").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Item menu gagal dibuat.");
  }
  refreshMenu(true);
}

export async function duplicateMenuItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item menu");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("category_id,name,slug,description,price,image_media_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Item menu tidak dapat dibaca. Salinan belum dibuat.");
  if (!data) throw new Error("Item menu tidak ditemukan. Muat ulang halaman lalu coba lagi.");
  const sortOrder = await nextSortOrder("menu_items", data.category_id);
  const copy = {
    ...data,
    name: `${data.name} Salinan`,
    slug: `${data.slug}-salinan-${Date.now()}`,
    sort_order: sortOrder,
    is_active: false,
    status: "draft" as const,
  };
  const result = await supabase.from("menu_items").insert(copy);
  if (result.error) throw new Error("Item menu gagal disalin.");
  revalidatePath("/admin/menu");
}

export async function deleteMenuItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item menu");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("menu_items").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Item menu gagal dihapus.");
  assertAffectedRows(count, 1, "Item menu tidak ditemukan atau tidak boleh dihapus.");
  refreshMenu(true);
}

export async function toggleMenuItem(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID item menu");
  const active = parseBooleanFlag(formData.get("active"), "Ketersediaan item menu");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("menu_items").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Ketersediaan item menu gagal diperbarui.");
  assertAffectedRows(count, 1, "Item menu tidak ditemukan atau tidak boleh diubah.");
  refreshMenu(true);
}
