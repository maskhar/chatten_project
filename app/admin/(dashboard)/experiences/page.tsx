import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExperiencesManagerClient } from "@/components/admin/experiences-manager-client";

export const dynamic = "force-dynamic";

export default async function ExperiencesManager() {
  const supabase = await createServerSupabaseClient();
  
  const [{ data: experiences }, { data: media }] = await Promise.all([
    supabase.from("experiences").select("*").order("sort_order"),
    supabase
      .from("media")
      .select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path")
      .eq("rights_status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ExperiencesManagerClient
      experiences={(experiences ?? []) as never[]}
      media={(media ?? []) as never[]}
      baseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
    />
  );
}
