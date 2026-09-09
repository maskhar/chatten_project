import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function requireAdmin() { const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/admin/login"); const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1); if (error || !data?.length) redirect("/admin/login?error=unauthorized"); return user; }
