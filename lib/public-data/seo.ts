import type { Metadata } from "next";
import { applySeoOverride, publicMetadata, type SeoOverride } from "@/lib/seo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// A28: one call site for the CMS-managed SEO row. Metadata generation must
// never take a page down, so a failed or missing lookup falls back to the
// page's own defaults instead of throwing out of generateMetadata.
export async function seoMetadata(pageKey: string, title: string, description: string, path: string): Promise<Metadata> {
  const base = publicMetadata(title, description, path);
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("seo_settings").select("title,description,canonical_url,og_media_id,robots").eq("page_key", pageKey).maybeSingle();
    return applySeoOverride(base, data as SeoOverride | null, path);
  } catch {
    return base;
  }
}
