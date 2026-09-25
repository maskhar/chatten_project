"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyOrder } from "@/lib/admin/reorder";
import { parseField, uuidSchema } from "@/lib/admin/form-schema";

/**
 * The ten fixed homepage sections. Mirrors the CHECK constraint on
 * chatten_cafe.homepage_sections.section_key: the table is a layout registry,
 * not a collection, so rows are never created or deleted through the CMS.
 */
const SECTION_KEYS = new Set([
  "hero",
  "moments",
  "about",
  "menu",
  "spaces",
  "experiences",
  "feature",
  "gallery",
  "testimonials",
  "visit",
]);

export async function toggleHomepageSection(formData: FormData) {
  await requireAdmin();
  // A81: the id went straight into .eq() as a raw string and `visible` was
  // read as `String(...) === "true"`, so any other posted value silently meant
  // "hide". Both are now rejected rather than reinterpreted.
  const id = parseField(uuidSchema, formData.get("id"), "ID bagian");
  const raw = String(formData.get("visible") ?? "");
  if (raw !== "true" && raw !== "false") {
    throw new Error("Status tampil tidak valid.");
  }
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase
    .from("homepage_sections")
    .update({ is_visible: raw === "true" }, { count: "exact" })
    .eq("id", id);
  if (error) throw new Error("Gagal memperbarui bagian homepage.");
  // RLS returns success with zero rows for a caller who may not write, which
  // would otherwise render as a state change that reverts on the next load.
  if (!count) throw new Error("Bagian homepage tidak ditemukan atau tidak boleh diubah.");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}

/**
 * Persists a complete homepage order.
 *
 * A79: the list must be the full current section set, not a subset. A partial
 * list renumbers the submitted rows from 0 and leaves the rest where they are,
 * which duplicates ranks — now rejected by the deferrable unique constraint at
 * commit, but rejected here first so the editor gets a real message.
 */
export async function reorderHomepageSections(ids: string[]) {
  await requireAdmin();
  if (!Array.isArray(ids) || !ids.length) throw new Error("Urutan homepage tidak valid.");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id,section_key");
  if (error) throw new Error("Gagal memuat urutan homepage.");

  const rows = (data ?? []) as { id: string; section_key: string }[];
  const submitted = new Set(ids);
  const known = new Set(rows.map((row) => row.id));
  if (
    submitted.size !== ids.length ||
    ids.length !== rows.length ||
    ids.some((id) => !known.has(id)) ||
    rows.some((row) => !SECTION_KEYS.has(String(row.section_key)))
  ) {
    throw new Error("Urutan homepage harus memuat seluruh bagian yang ada.");
  }

  await applyOrder("homepage_sections", ids, 0, "urutan homepage");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}
