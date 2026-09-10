"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveExperience(formData: FormData) {
  await requireAdmin();
  
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  
  if (!name) throw new Error("Experience name is required.");
  if (!slug) throw new Error("Experience slug is required.");
  if (!description) throw new Error("Experience description is required.");
  
  const supabase = await createServerSupabaseClient();
  
  const imageMediaId = String(formData.get("image_media_id") ?? "") || null;
  
  // Validate approved media if provided
  if (imageMediaId) {
    const { data, error } = await supabase
      .from("media")
      .select("rights_status")
      .eq("id", imageMediaId)
      .maybeSingle();
    if (error || data?.rights_status !== "approved") {
      throw new Error("Experience image must be an approved media item.");
    }
  }
  
  const payload = {
    name,
    slug,
    description,
    image_media_id: imageMediaId,
    is_active: formData.get("is_active") === "on",
    status: String(formData.get("status") ?? "draft"),
  };
  
  const result = id
    ? await supabase.from("experiences").update(payload).eq("id", id)
    : await supabase.from("experiences").insert({
        ...payload,
        sort_order:
          Number(
            (
              (await supabase
                .from("experiences")
                .select("sort_order")
                .order("sort_order", { ascending: false })
                .limit(1)
                .maybeSingle()).data as { sort_order: number } | null
            )?.sort_order ?? -1
          ) + 1,
      });
  
  if (result.error) throw new Error("Unable to save experience.");
  
  revalidatePath("/admin/experiences");
  revalidatePath("/experience");
  revalidatePath("/");
}
