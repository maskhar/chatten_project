import { SpacesManagerClient } from "@/components/admin/spaces-manager-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpacesManagerPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: spaces }, { data: media }] = await Promise.all([
    supabase.from("spaces").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("media").select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path").eq("rights_status", "approved").order("created_at", { ascending: false }),
  ]);

  return <SpacesManagerClient spaces={(spaces ?? []) as never[]} media={(media ?? []) as never[]} />;
}
