import { notFound } from "next/navigation";
import { SpaceEditForm } from "@/components/admin/space-edit-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpaceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [{ data: space }, { data: media }] = await Promise.all([
    supabase.from("spaces").select("*").eq("id", id).maybeSingle(),
    supabase.from("media").select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path").eq("rights_status", "approved").order("created_at", { ascending: false }),
  ]);
  if (!space) notFound();
  return <SpaceEditForm space={space as never} media={(media ?? []) as never[]} baseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}
