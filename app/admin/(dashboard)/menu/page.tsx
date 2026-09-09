import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuManagerClient } from "@/components/admin/menu-manager-client";
export const dynamic="force-dynamic";
export default async function MenuManager(){const supabase=await createServerSupabaseClient();const [{data:categories},{data:items},{data:media}]=await Promise.all([supabase.from("menu_categories").select("*").order("sort_order"),supabase.from("menu_items").select("*").order("sort_order"),supabase.from("media").select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path").eq("rights_status","approved").order("created_at",{ascending:false})]);return <MenuManagerClient categories={(categories??[]) as never[]} items={(items??[]) as never[]} media={(media??[]) as never[]}/>}
