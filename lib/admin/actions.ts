"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dynamicTable } from "@/lib/supabase/dynamic";
import { minRoleFor, resourceFor } from "./resources";
import { MAP_EMBED_HOSTS, URL_FIELD_KEYS, isSafeInternalPath, isSafeUrl, isSafeUrlWithHost } from "@/lib/url-safety";

// Resolves the resource from the form *before* authorizing, so the required
// role can depend on which resource is being written (A9).
async function authorizeResource(formData: FormData) {
  const resource = resourceFor(String(formData.get("resource")));
  if (!resource) throw new Error("Unknown resource");
  await requireAdmin(minRoleFor(resource));
  return resource;
}
function value(field: string, input: FormDataEntryValue | null) { if (input === null || input === "") return null; if (field === "sort_order" || field === "day_of_week") return Number(input); if (field === "price") return Number(input); return input; }

// A13: reject dangerous URL schemes before they reach the DB. Runs on the
// assembled payload so it covers both insert and update, and every resource
// that happens to expose one of these field keys.
function assertSafeUrls(payload: Record<string, unknown>) {
  for (const key of URL_FIELD_KEYS) {
    const raw = payload[key];
    if (typeof raw !== "string" || raw === "") continue;
    if (!isSafeUrl(raw)) throw new Error(`"${key}" must be an http(s) URL.`);
  }
  const mapEmbed = payload.map_embed_url;
  if (typeof mapEmbed === "string" && mapEmbed !== "" && !isSafeUrlWithHost(mapEmbed, MAP_EMBED_HOSTS, ["https:"])) {
    throw new Error(`"map_embed_url" must be an https URL from a supported map provider (${MAP_EMBED_HOSTS.join(", ")}).`);
  }
  const href = payload.href;
  if (typeof href === "string" && href !== "" && !isSafeInternalPath(href)) {
    throw new Error('"href" must be a site-relative path starting with "/".');
  }
}
export async function saveResource(formData: FormData) { const resource=await authorizeResource(formData); const id=formData.get("id"); const payload=Object.fromEntries(resource.fields.map(field=>[field.key,field.type==="checkbox"?formData.get(field.key)==="on":value(field.key,formData.get(field.key))]).filter(([key,entry])=>entry!==null||key==="image_media_id")); assertSafeUrls(payload); const supabase=await createServerSupabaseClient(); const imageMediaId=payload.image_media_id; const isPublished=payload.status==="published"&&payload.is_active!==false; if(isPublished&&typeof imageMediaId==="string"){const {data,error}=await supabase.from("media").select("rights_status").eq("id",imageMediaId).maybeSingle();if(error||data?.rights_status!=="approved")throw new Error("Published content requires an approved image.");} const query=id?dynamicTable(supabase, resource.table).update(payload).eq("id",String(id)):dynamicTable(supabase, resource.table).insert(payload); const {error}=await query;if(error)throw new Error("Unable to save content.");revalidatePath("/");revalidatePath(`/admin/${resource.key}`);redirect(`/admin/${resource.key}?saved=1`); }
// A26: `offset` is the rank of the first submitted row within the whole table.
// The list view is paginated, so without it page 2 would renumber its rows from
// 0 and collide with page 1 instead of continuing after it.
export async function reorderResource(formData: FormData) { const resource=await authorizeResource(formData); if(!resource.fields.some(field=>field.key==="sort_order")) throw new Error("This resource has no display order."); const ids=String(formData.get("ids") ?? "").split(",").filter(Boolean); if(!ids.length) throw new Error("No order supplied."); const rawOffset=Number(formData.get("offset") ?? 0); const offset=Number.isInteger(rawOffset)&&rawOffset>=0?rawOffset:0; const supabase=await createServerSupabaseClient(); const results=await Promise.all(ids.map((id,index)=>dynamicTable(supabase, resource.table).update({ sort_order:offset+index }).eq("id",id))); if(results.some(({error})=>error)) throw new Error("Unable to save order."); revalidatePath("/"); revalidatePath(`/admin/${resource.key}`); }
export async function deleteResource(formData: FormData) { const resource=await authorizeResource(formData); const id=String(formData.get("id")); if(!id)throw new Error("Invalid content request"); const supabase=await createServerSupabaseClient(); const {error}=await dynamicTable(supabase, resource.table).delete().eq("id",id); if(error)throw new Error("Unable to delete content."); revalidatePath("/");revalidatePath(`/admin/${resource.key}`); }
export async function signOut(){const supabase=await createServerSupabaseClient();await supabase.auth.signOut();redirect("/admin/login");}