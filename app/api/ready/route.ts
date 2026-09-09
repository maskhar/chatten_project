import { createServerSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() { try { const supabase = await createServerSupabaseClient(); const { error } = await supabase.from("site_settings").select("id").limit(1); if (error) return Response.json({ status: "not_ready" }, { status: 503 }); return Response.json({ status: "ready" }); } catch { return Response.json({ status: "not_ready" }, { status: 503 }); } }
