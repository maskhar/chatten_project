"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const roles = ["super_admin", "admin", "editor"] as const;
type CmsRole = typeof roles[number];
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

async function currentRole(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role as CmsRole | undefined;
}

export async function addCmsUser(formData: FormData) {
  const current = await requireAdmin("admin");
  if (await currentRole(current.id) !== "super_admin") throw new Error("Only super admins can add CMS users.");
  const userId = String(formData.get("user_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) as CmsRole;
  if (!uuid.test(userId) || !roles.includes(role)) throw new Error("Invalid CMS user details.");
  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user || data.user.id !== userId || (email && data.user.email?.toLowerCase() !== email)) throw new Error("Auth identity does not match the supplied CMS user details.");
  const supabase = await createServerSupabaseClient();
  const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, display_name: data.user.user_metadata?.full_name ?? null }, { onConflict: "id" });
  if (profileError) throw new Error("Unable to create CMS profile.");
  const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (roleError) throw new Error("Unable to assign CMS role.");
  revalidatePath("/admin/users");
}

export async function saveRole(formData: FormData) { const current = await requireAdmin("admin"); const userId = String(formData.get("user_id")); const role = String(formData.get("role")) as CmsRole; if (!uuid.test(userId) || !roles.includes(role)) throw new Error("Invalid role."); const ownRole = await currentRole(current.id); if (role === "super_admin" && ownRole !== "super_admin") throw new Error("Only super admins can grant super admin."); if (userId === current.id && ownRole === "super_admin" && role !== "super_admin") throw new Error("Super admin cannot remove own protection."); const supabase = await createServerSupabaseClient(); const { data: target } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(); if (target?.role === "super_admin" && ownRole !== "super_admin") throw new Error("Only super admins can change a super admin role."); const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" }); if (error) throw new Error("Unable to save role."); revalidatePath("/admin/users"); }
export async function removeRole(formData: FormData) { const current = await requireAdmin("admin"); const userId = String(formData.get("user_id")); if (!uuid.test(userId)) throw new Error("Invalid CMS user."); if (userId === current.id) throw new Error("You cannot remove your own role."); const ownRole = await currentRole(current.id); const supabase = await createServerSupabaseClient(); const { data: target } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(); if (target?.role === "super_admin" && ownRole !== "super_admin") throw new Error("Only super admins can remove super admin."); const { error } = await supabase.from("user_roles").delete().eq("user_id", userId); if (error) throw new Error("Unable to remove role."); revalidatePath("/admin/users"); }