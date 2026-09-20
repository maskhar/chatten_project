import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const cmsRoles = ["editor", "admin", "super_admin"] as const;
export type CmsRole = typeof cmsRoles[number];
const rank: Record<CmsRole, number> = { editor: 0, admin: 1, super_admin: 2 };

// Reads user_roles with the RLS-bound session client on purpose: the own_role
// policy (20260921000100) lets a member read only their own row, so the check
// stays a real database boundary instead of a client-trusted claim.
export async function requireAdmin(minRole: CmsRole = "editor") {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = data?.role as CmsRole | undefined;
  if (error || !role || !(role in rank)) redirect("/admin/login?error=unauthorized");
  if (rank[role] < rank[minRole]) redirect("/admin?error=forbidden");
  return Object.assign(user, { cmsRole: role });
}
