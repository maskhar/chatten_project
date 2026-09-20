import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicAbout, PublicCard, PublicContact, PublicEvent, PublicGalleryItem, PublicHour, PublicMedia, PublicMenuItem, PublicSocial } from "./types";
import { mediaMap } from "./media";
import type { TableName } from "@/types/tables";

// A39: getHomepageData has always swallowed its own failure so a database
// blip degrades to an empty page instead of a 500. These helpers did not, so
// the same blip took every other public route down. `guard` gives them all
// the same contract: return the empty shape, never throw.
async function guard<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

export async function publicRows<T>(table: TableName, order = "sort_order") {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from(table).select("*").order(order, { ascending: true });
    return (result.data ?? []) as unknown as T[];
  }, [] as T[]);
}

// A57: filter in the database rather than in JS. The old helpers fetched every
// row and dropped the hidden ones after the fact, which shipped unpublished
// content to the server for no reason — and about_sections was never filtered
// at all, so drafts were public.
//
// The table parameter is narrowed to the tables that actually carry both
// columns. `menu_categories` has no `status` and `opening_hours` has neither,
// so passing either here would have produced a PostgREST error at runtime
// rather than a compile error.
type VisibleTable = "hero_slides" | "moments" | "about_sections" | "experiences" | "spaces" | "menu_items" | "gallery_items" | "testimonials" | "promotions" | "events";

async function publicVisibleRows<T>(table: VisibleTable, order = "sort_order") {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from(table).select("*").eq("is_active", true).eq("status", "published").order(order, { ascending: true });
    return (result.data ?? []) as unknown as T[];
  }, [] as T[]);
}

export async function publicMedia() {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from("media").select("*").eq("rights_status", "approved");
    return mediaMap(result.data ?? []);
  }, {} as Record<string, PublicMedia>);
}

// A60: detail pages used to load the whole collection and Array.find the slug.
// One indexed row lookup replaces that, and it no longer depends on the row
// being inside whatever slice the list query returned.
export async function publicCardBySlug(table: "experiences" | "spaces", slug: string) {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from(table).select("*").eq("slug", slug).eq("is_active", true).eq("status", "published").maybeSingle();
    return (result.data as PublicCard | null) ?? null;
  }, null as PublicCard | null);
}

export async function publicEventBySlug(slug: string) {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from("events").select("*").eq("slug", slug).eq("is_active", true).eq("status", "published").maybeSingle();
    return (result.data as PublicEvent | null) ?? null;
  }, null as PublicEvent | null);
}

export async function publicMediaById(id: string | null | undefined) {
  if (!id) return null;
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.from("media").select("*").eq("id", id).eq("rights_status", "approved").maybeSingle();
    return (result.data as PublicMedia | null) ?? null;
  }, null as PublicMedia | null);
}

// menu_categories is the one content table with no `status` column, so it is
// filtered on is_active alone rather than through publicVisibleRows.
export async function publicMenu() {
  const [items, categories] = await Promise.all([
    publicVisibleRows<PublicMenuItem>("menu_items"),
    guard(async () => {
      const supabase = await createServerSupabaseClient();
      const result = await supabase.from("menu_categories").select("id,name").eq("is_active", true).order("sort_order", { ascending: true });
      return (result.data ?? []) as unknown as { id: string; name: string }[];
    }, [] as { id: string; name: string }[]),
  ]);
  return { items, categories };
}
export async function publicCards(table: "experiences" | "spaces") { return publicVisibleRows<PublicCard>(table); }
export async function publicAbout() { return publicVisibleRows<PublicAbout>("about_sections"); }
export async function publicGallery() { return (await publicVisibleRows<PublicGalleryItem>("gallery_items")).filter((item) => item.image_media_id); }
export async function publicEvents() { return publicVisibleRows<PublicEvent>("events", "starts_at"); }

export async function publicVisit() {
  return guard(async () => {
    const supabase = await createServerSupabaseClient();
    const [contact, hours, socials] = await Promise.all([
      supabase.from("contact_information").select("*").eq("is_active", true).limit(1).maybeSingle(),
      supabase.from("opening_hours").select("*").order("day_of_week"),
      supabase.from("social_links").select("*").eq("is_active", true).order("sort_order"),
    ]);
    return { contact: contact.data as PublicContact | null, hours: (hours.data ?? []) as unknown as PublicHour[], socials: (socials.data ?? []) as unknown as PublicSocial[] };
  }, { contact: null as PublicContact | null, hours: [] as PublicHour[], socials: [] as PublicSocial[] });
}
