import type { NavItem } from "@/lib/homepage/types";
import { navigationLinks } from "./navigation";
import type { PublicSocial } from "./types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ShellData = { navigation: NavItem[]; socials: PublicSocial[] };

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
    const [navigation, socials] = await Promise.all([
      supabase.from("navigation_items").select("label,href,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("social_links").select("platform,label,url").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);
    return {
      navigation: navigationLinks((navigation.data ?? []) as unknown as NavItem[]),
      socials: (socials.data ?? []) as unknown as PublicSocial[],
    };
  } catch {
    return { navigation: navigationLinks(null), socials: [] };
  }
}
