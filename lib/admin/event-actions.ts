"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAffectedRows,
  assertRange,
  parseBooleanFlag,
  parseCheckbox,
  parseOptionalText,
  parseOptionalUuid,
  parseRequiredText,
  parseSlug,
  parseStatus,
  parseTimestamp,
  parseUuid,
} from "@/lib/admin/form-schema";

function refresh() {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function saveEvent(formData: FormData) {
  await requireAdmin();
  const id = parseOptionalUuid(formData.get("id"), "ID event");
  const title = parseRequiredText(formData.get("title"), "Judul event");
  const slug = parseSlug(formData.get("slug"), title, "Slug event");
  // events.starts_at is `not null`; ends_at is optional but bounded by the
  // table's own `ends_at >= starts_at` CHECK.
  const startsAt = parseTimestamp(formData.get("starts_at"), "Waktu mulai event", { required: true });
  const endsAt = parseTimestamp(formData.get("ends_at"), "Waktu selesai event");
  assertRange(startsAt, endsAt, "event");
  const imageMediaId = parseOptionalUuid(formData.get("image_media_id"), "ID gambar event");
  const payload = {
    title,
    slug,
    summary: parseOptionalText(formData.get("summary"), "Ringkasan event"),
    body: parseOptionalText(formData.get("body"), "Isi event"),
    image_media_id: imageMediaId,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: parseCheckbox(formData.get("is_active"), "Status aktif event"),
    status: parseStatus(formData.get("status"), { strict: true, label: "status event" }),
  };
  const supabase = await createServerSupabaseClient();
  if (imageMediaId) {
    const mediaLookup = await supabase.from("media").select("id").eq("id", imageMediaId).maybeSingle();
    if (mediaLookup.error) throw new Error("Gambar tidak dapat diperiksa. Event belum disimpan.");
    if (!mediaLookup.data) throw new Error("Gambar tidak ditemukan di Media Library. Pilih gambar lain.");
  }
  if (id) {
    const { error, count } = await supabase.from("events").update(payload, { count: "exact" }).eq("id", id);
    if (error) throw new Error("Event gagal disimpan.");
    assertAffectedRows(count, 1, "Event tidak ditemukan atau tidak boleh diubah.");
  } else {
    const { error } = await supabase.from("events").insert(payload);
    if (error) throw new Error("Event gagal dibuat.");
  }
  refresh();
  redirect("/admin/events?saved=1");
}

export async function setEventActive(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID event");
  const active = parseBooleanFlag(formData.get("active"), "Status tampil event");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("events").update({ is_active: active }, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Status tampil event gagal diperbarui.");
  assertAffectedRows(count, 1, "Event tidak ditemukan atau tidak boleh diubah.");
  refresh();
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = parseUuid(formData.get("id"), "ID event");
  const supabase = await createServerSupabaseClient();
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Event gagal dihapus.");
  assertAffectedRows(count, 1, "Event tidak ditemukan atau tidak boleh dihapus.");
  refresh();
}
