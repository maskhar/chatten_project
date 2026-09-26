import type { NavItem } from "@/lib/homepage/types";
import { navigationLinks } from "./navigation";
import type { PublicContact, PublicHour, PublicSocial } from "./types";
import type { SiteIdentity } from "./structured-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// A46: identity, contact and hours are here rather than on the pages that
// display them because the `Restaurant` JSON-LD is emitted on every public
// page, not only on /visit.
export type ShellBusiness = { identity: SiteIdentity; contact: PublicContact | null; hours: PublicHour[] };
export type ShellData = ShellBusiness & { navigation: NavItem[]; socials: PublicSocial[] };

const FALLBACK_IDENTITY: SiteIdentity = { name: "Chatten Cafe", description: "A place to eat, talk, and experience Batu." };

// A33: only the homepage ever passed navigation and socials into PublicShell,
// so every other page silently rendered the hardcoded fallback links and no
// CMS social links at all. Resolving it here means the shell is self-serving
// and no page has to remember to pass them.
//
// Like getHomepageData, this swallows its own failure: chrome that cannot load
// should degrade to the fallback links, not take down the page body with it.
export async function getShellData(): Promise<ShellData> {
  try {
    const supabase = await createServerSupabaseClient();
    const [navigation, socials, settings, contact, hours] = await Promise.all([
      supabase.from("navigation_items").select("label,href,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("social_links").select("platform,label,url").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("site_settings").select("site_name,description").limit(1).maybeSingle(),
      supabase.from("contact_information").select("*").eq("is_active", true).limit(1).maybeSingle(),
      supabase.from("opening_hours").select("day_of_week,opens_at,closes_at,is_closed").order("day_of_week", { ascending: true }),
    ]);
    const identityRow = settings.data as { site_name?: string | null; description?: string | null } | null;
    return {
      navigation: navigationLinks((navigation.data ?? []) as unknown as NavItem[]),
      socials: (socials.data ?? []) as unknown as PublicSocial[],
      identity: { name: identityRow?.site_name?.trim() || FALLBACK_IDENTITY.name, description: identityRow?.description?.trim() || FALLBACK_IDENTITY.description },
      contact: (contact.data as PublicContact | null) ?? null,
      hours: (hours.data ?? []) as unknown as PublicHour[],
    };
  } catch {
    return { navigation: navigationLinks(null), socials: [], identity: FALLBACK_IDENTITY, contact: null, hours: [] };
  }
}
