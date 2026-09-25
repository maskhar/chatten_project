"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dynamicTable } from "@/lib/supabase/dynamic";
import { applyOrder, isReorderableTable, normalizeOffset } from "@/lib/admin/reorder";
import { allowedValues, minRoleFor, resourceFor, type Resource } from "./resources";
import { MAP_EMBED_HOSTS, URL_FIELD_KEYS, isSafeInternalPath, isSafeUrl, isSafeUrlWithHost } from "@/lib/url-safety";
import { coerceFieldValue, optionalUuidSchema, parseField, uuidSchema } from "./form-schema";

// Resolves the resource from the form *before* authorizing, so the required
// role can depend on which resource is being written (A9).
async function authorizeResource(formData: FormData) {
  const resource = resourceFor(String(formData.get("resource")));
  if (!resource) throw new Error("Unknown resource");
  await requireAdmin(minRoleFor(resource));
  return resource;
}
// A61: was `Number(input)` with no NaN guard, so a non-numeric sort_order,
// day_of_week or price became NaN, serialised to null, and was rejected by a
// NOT NULL column instead of by the form. Status was not checked here at all.
function value(field: string, input: FormDataEntryValue | null, label = field) { return coerceFieldValue(field, input, label); }

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
// Phase 6: a select is a convenience in the browser, not a boundary. The
// form posts whatever it is given, so the closed sets — day_of_week,
// platform, href, page_key, robots, status — are re-checked here against the
// same declaration the form rendered from.
function assertAllowedChoices(resource: Resource, payload: Record<string, unknown>) {
  for (const field of resource.fields) {
    const allowed = allowedValues(field);
    if (!allowed) continue;
    const raw = payload[field.key];
    if (raw === null || raw === undefined || raw === "") continue;
    if (!allowed.includes(String(raw))) throw new Error(`"${field.label}" is not one of the available options.`);
  }
}

export async function saveResource(formData: FormData) {
  const resource = await authorizeResource(formData);
  const id = parseField(optionalUuidSchema, formData.get("id"), "ID konten");
  const entries = resource.fields.map((field) => {
    const input = formData.get(field.key);
    if (field.required && field.type !== "checkbox") {
      const raw = typeof input === "string" ? input.trim() : "";
      if (!raw) throw new Error(`${field.label} wajib diisi.`);
    }
    return [
      field.key,
      field.type === "checkbox"
        ? formData.get(field.key) === "on"
        : value(field.key, input, field.label),
    ] as const;
  });
  const payload = Object.fromEntries(
    entries.filter(([key, entry]) => entry !== null || key === "image_media_id"),
  );
  assertSafeUrls(payload);
  assertAllowedChoices(resource, payload);

  const supabase = await createServerSupabaseClient();
  if (id) {
    const { error, count } = await dynamicTable(supabase, resource.table)
      .update(payload, { count: "exact" })
      .eq("id", id);
    if (error) throw new Error("Gagal menyimpan konten.");
    if (count !== 1) {
      throw new Error("Konten tidak ditemukan atau tidak boleh diubah.");
    }
  } else {
    const { error } = await dynamicTable(supabase, resource.table).insert(payload);
    if (error) throw new Error("Gagal menyimpan konten.");
  }

  revalidatePath("/");
  revalidatePath(`/admin/${resource.key}`);
  redirect(`/admin/${resource.key}?saved=1`);
}
// A26: `offset` is the rank of the first submitted row within the whole table.
// The list view is paginated, so without it page 2 would renumber its rows from
// 0 and collide with page 1 instead of continuing after it.
export async function reorderResource(formData: FormData) { const resource=await authorizeResource(formData); if(!resource.fields.some(field=>field.key==="sort_order")) throw new Error("This resource has no display order."); if(!isReorderableTable(resource.table)) throw new Error("This resource has no display order."); const ids=String(formData.get("ids") ?? "").split(",").filter(Boolean); if(!ids.length) throw new Error("The new order was not received. Reload the page and try reordering again."); await applyOrder(resource.table, ids, normalizeOffset(formData.get("offset")), "order"); revalidatePath("/"); revalidatePath(`/admin/${resource.key}`); }
export async function deleteResource(formData: FormData) {
  const resource = await authorizeResource(formData);
  // `String(null)` is "nope" — the old truthiness check let the literal string
  // "null" through to .eq(), where PostgREST rejected it as a malformed uuid
  // and the editor saw "Unable to delete content".
  const id = parseField(uuidSchema, formData.get("id"), "ID konten");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await dynamicTable(supabase, resource.table)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error("Gagal menghapus konten.");
  if (count !== 1) {
    throw new Error("Konten tidak ditemukan atau tidak boleh dihapus.");
  }
  revalidatePath("/");
  revalidatePath(`/admin/${resource.key}`);
}
export async function signOut(){const supabase=await createServerSupabaseClient();await supabase.auth.signOut();redirect("/admin/login");}