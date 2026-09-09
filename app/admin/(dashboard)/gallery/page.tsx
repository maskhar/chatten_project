import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GalleryManagerClient } from "@/components/admin/gallery-manager-client";
export const dynamic="force-dynamic";
export default async function GalleryManager(){const supabase=await createServerSupabaseClient();const [{data:items},{data:media}]=await Promise.all([supabase.from("gallery_items").select("*").order("sort_order"),supabase.from("media").select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path").eq("rights_status","approved").order("created_at",{ascending:false})]);return <GalleryManagerClient items={(items??[]) as never[]} media={(media??[]) as never[]} baseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL??""}/>}
