import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExperienceEditForm } from "@/components/admin/experience-edit-form";

export const dynamic = "force-dynamic";

export default async function ExperienceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const supabase = await createServerSupabaseClient();
  
  const [{ data: experience }, { data: media }] = await Promise.all([
    supabase.from("experiences").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("media")
      .select("id,title,alt_text,category,width,height,bucket,storage_path")
      
      .order("created_at", { ascending: false }),
  ]);

  if (!experience) notFound();

  return (
    <ExperienceEditForm
      experience={experience as never}
      media={(media ?? []) as never[]}
    />
  );
}