"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { assertAffectedRows, parseRole, parseUuid, type CmsRoleValue } from "@/lib/admin/form-schema";

/**
 * The caller's own stored role, read through the RLS-bound session client.
 *
 * `requireAdmin` already returns it, but the role decisions below are the
 * privilege boundary, so the row is re-read at decision time rather than
 * trusted from an earlier request. A failed read is an error, not an absent
 * role: swallowing it used to downgrade a super_admin to "not a super_admin"
 * and produce a confusing refusal instead of a retry.
 */
async function currentRole(userId: string): Promise<CmsRoleValue> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Peran Anda tidak dapat diperiksa. Coba lagi sebentar.");
  const role = data?.role;
  if (!role) throw new Error("Peran Anda tidak ditemukan. Hubungi super admin.");
  return parseRole(role, "Peran Anda");
}

/** The target member's stored role, or null when they have none yet. */
async function storedRole(userId: string): Promise<CmsRoleValue | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Peran pengguna tidak dapat diperiksa. Perubahan belum disimpan.");
  return data?.role ? parseRole(data.role, "Peran pengguna") : null;
}

export async function addCmsUser(formData: FormData) {
  const current = await requireAdmin("admin");
  if ((await currentRole(current.id)) !== "super_admin") throw new Error("Hanya super admin yang dapat menambah pengguna CMS.");
  const userId = parseUuid(formData.get("user_id"), "ID pengguna");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseRole(formData.get("role"), "Peran CMS");
  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user || data.user.id !== userId || (email && data.user.email?.toLowerCase() !== email)) {
    throw new Error("Identitas Auth tidak cocok dengan data pengguna CMS yang dikirim.");
  }
  const supabase = await createServerSupabaseClient();
  const { error: profileError, count: profileCount } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: data.user.user_metadata?.full_name ?? null }, { onConflict: "id", count: "exact" });
  if (profileError) throw new Error("Profil CMS gagal dibuat.");
  assertAffectedRows(profileCount, 1, "Profil CMS tidak dapat dibuat atau tidak boleh diubah.");
  const { error: roleError, count: roleCount } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id", count: "exact" });
  if (roleError) throw new Error("Peran CMS gagal ditetapkan.");
  assertAffectedRows(roleCount, 1, "Peran CMS tidak dapat ditetapkan atau tidak boleh diubah.");
  revalidatePath("/admin/users");
}

export async function saveRole(formData: FormData) {
  const current = await requireAdmin("admin");
  const userId = parseUuid(formData.get("user_id"), "ID pengguna");
  const role = parseRole(formData.get("role"), "Peran CMS");
  const ownRole = await currentRole(current.id);
  if (role === "super_admin" && ownRole !== "super_admin") throw new Error("Hanya super admin yang dapat memberikan peran super admin.");
  if (userId === current.id && ownRole === "super_admin" && role !== "super_admin") throw new Error("Super admin tidak dapat melepas proteksi dirinya sendiri.");
  const target = await storedRole(userId);
  if (target === "super_admin" && ownRole !== "super_admin") throw new Error("Hanya super admin yang dapat mengubah peran super admin.");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id", count: "exact" });
  if (error) throw new Error("Peran gagal disimpan.");
  assertAffectedRows(count, 1, "Peran tidak ditemukan atau tidak boleh diubah.");
  revalidatePath("/admin/users");
}

export async function removeRole(formData: FormData) {
  const current = await requireAdmin("admin");
  const userId = parseUuid(formData.get("user_id"), "ID pengguna");
  if (userId === current.id) throw new Error("Anda tidak dapat menghapus peran Anda sendiri.");
  const ownRole = await currentRole(current.id);
  const target = await storedRole(userId);
  if (!target) throw new Error("Pengguna CMS tidak ditemukan atau sudah tidak memiliki peran.");
  if (target === "super_admin" && ownRole !== "super_admin") throw new Error("Hanya super admin yang dapat menghapus super admin.");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("user_roles").delete({ count: "exact" }).eq("user_id", userId);
  if (error) throw new Error("Peran gagal dihapus.");
  assertAffectedRows(count, 1, "Peran tidak ditemukan atau tidak boleh dihapus.");
  revalidatePath("/admin/users");
}
