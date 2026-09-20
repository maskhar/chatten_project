export type PublicMedia = { id: string; bucket: string; storage_path: string; alt_text: string | null; width: number | null; height: number | null; focal_x?: number | null; focal_y?: number | null };
export type PublicCard = { id: string; name: string; slug: string; description: string | null; image_media_id: string | null; sort_order: number; status?: string; is_active?: boolean };
export type PublicMenuItem = PublicCard & { category_id: string; price: number | null };
export type PublicEvent = { id: string; title: string; slug: string; summary: string | null; body: string | null; image_media_id: string | null; starts_at: string; ends_at: string | null; status: string; is_active: boolean };
export type PublicGalleryItem = { id: string; title: string | null; image_media_id: string | null; alt_text: string; sort_order: number; is_active?: boolean; status?: string };
export type PublicAbout = { id: string; title: string; body: string; image_media_id: string | null; sort_order: number };
export type PublicContact = { address: string | null; phone: string | null; email: string | null; whatsapp_url: string | null; map_url: string | null; directions_url: string | null; map_embed_url: string | null };
export type PublicHour = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
export type PublicSocial = { platform: string; label: string | null; url: string };

