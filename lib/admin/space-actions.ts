"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveSpace(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageMediaId = String(formData.get("image_media_id") ?? "") || null;
  const status = String(formData.get("status") ?? "draft");

  if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid space ID.");
  if (!name) throw new Error("Space name is required.");
  if (!slug) throw new Error("Space slug is required.");
  if (!['draft', 'published'].includes(status)) throw new Error("Invalid space status.");

  const supabase = await createServerSupabaseClient();

  if (imageMediaId) {
    const { data, error } = await supabase
      .from("media")
      .select("rights_status")
      .eq("id", imageMediaId)
      .maybeSingle();

    if (error || data?.rights_status !== "approved") {
      throw new Error("Space image must be an approved media item.");
    }
  }

  const payload = {
    name,
    slug,
    description,
    image_media_id: imageMediaId,
    is_active: formData.get("is_active") === "on",
    status,
  };

  if (id) {
    const { error } = await supabase.from("spaces").update(payload).eq("id", id);
    if (error) throw new Error("Unable to save space.");
  } else {
    const latest = await supabase
      .from("spaces")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = Number((latest.data as { sort_order: number } | null)?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("spaces").insert({ ...payload, sort_order: sortOrder });
    if (error) throw new Error("Unable to create space.");
  }

  revalidatePath("/admin/spaces");
  revalidatePath("/spaces");
  revalidatePath("/");
  redirect("/admin/spaces?saved=1");
}
