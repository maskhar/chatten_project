import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicAbout, PublicCard, PublicContact, PublicEvent, PublicGalleryItem, PublicHour, PublicMenuItem, PublicSocial } from "./types";
import { mediaMap } from "./media";

export async function publicRows<T>(table: string, order = "sort_order") {
  const supabase = await createServerSupabaseClient();
  const query = supabase.from(table).select("*").order(order, { ascending: true });
  const result = await query;
  return (result.data ?? []) as unknown as T[];
}

export async function publicMedia() { const supabase = await createServerSupabaseClient(); const result = await supabase.from("media").select("*"); return mediaMap(result.data ?? []); }
export async function publicMenu() { const [items, categories] = await Promise.all([publicRows<PublicMenuItem>("menu_items"), publicRows<{ id: string; name: string }>("menu_categories")]); return { items: items.filter((item) => item.is_active !== false && item.status === "published"), categories }; }
export async function publicCards(table: "experiences" | "spaces") { return (await publicRows<PublicCard>(table)).filter((item) => item.is_active !== false && item.status === "published"); }
export async function publicAbout() { return publicRows<PublicAbout>("about_sections"); }
export async function publicGallery() { return (await publicRows<PublicGalleryItem>("gallery_items")).filter((item) => item.image_media_id); }
export async function publicEvents() { const rows = await publicRows<PublicEvent>("events", "starts_at"); return rows.filter((item) => item.is_active && item.status === "published"); }
export async function publicVisit() { const supabase = await createServerSupabaseClient(); const [contact, hours, socials] = await Promise.all([supabase.from("contact_information").select("*").eq("is_active", true).limit(1).maybeSingle(), supabase.from("opening_hours").select("*").order("day_of_week"), supabase.from("social_links").select("*").eq("is_active", true).order("sort_order")]); return { contact: contact.data as PublicContact | null, hours: (hours.data ?? []) as unknown as PublicHour[], socials: (socials.data ?? []) as unknown as PublicSocial[] }; }
