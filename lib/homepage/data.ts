import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HomepageData, Media } from "./types";

const empty: HomepageData = { settings: null, hero: null, moments: [], stories: [], experiences: [], spaces: [], categories: [], menu: [], gallery: [], testimonials: [], feature: null, hours: [], contact: null, socials: [], navigation: [], media: {} };
const rows = async (supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, table: string, order = "sort_order") => { const result = await supabase.from(table).select("*").order(order, { ascending: true }); return result.data ?? []; };

export async function getHomepageData(): Promise<HomepageData> {
  try {
    const supabase = await createServerSupabaseClient();
    const [settings, hero, moments, stories, experiences, spaces, categories, menu, gallery, testimonials, promotions, events, hours, contact, socials, navigation, media] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).maybeSingle(), rows(supabase, "hero_slides"), rows(supabase, "moments"), rows(supabase, "about_sections"), rows(supabase, "experiences"), rows(supabase, "spaces"), rows(supabase, "menu_categories"), rows(supabase, "menu_items"), rows(supabase, "gallery_items"), rows(supabase, "testimonials"), rows(supabase, "promotions", "sort_order"), rows(supabase, "events", "sort_order"), rows(supabase, "opening_hours", "day_of_week"), supabase.from("contact_information").select("*").eq("is_active", true).limit(1).maybeSingle(), rows(supabase, "social_links"), rows(supabase, "navigation_items"), supabase.from("media").select("*")
    ]);
    const now = Date.now();
    const featureRows = [...(promotions as unknown as HomepageData["feature"][]), ...(events as unknown as HomepageData["feature"][])];
    const activeFeature = featureRows.find((item) => item && (!item.starts_at || new Date(item.starts_at).getTime() <= now) && (!item.ends_at || new Date(item.ends_at).getTime() >= now)) ?? null;
    const mediaMap = Object.fromEntries(((media.data ?? []) as unknown as Media[]).map((item: Media) => [item.id, item]));
    return { settings: settings.data as HomepageData["settings"], hero: (hero as unknown as HomepageData["hero"][])[0] ?? null, moments: moments as HomepageData["moments"], stories: stories as HomepageData["stories"], experiences: experiences as HomepageData["experiences"], spaces: spaces as HomepageData["spaces"], categories: categories as HomepageData["categories"], menu: (menu as HomepageData["menu"]).slice(0, 8), gallery: (gallery as HomepageData["gallery"]).slice(0, 8), testimonials: (testimonials as HomepageData["testimonials"]).slice(0, 4), feature: activeFeature, hours: hours as HomepageData["hours"], contact: contact.data as HomepageData["contact"], socials: socials as HomepageData["socials"], navigation: navigation as HomepageData["navigation"], media: mediaMap };
  } catch { return empty; }
}
