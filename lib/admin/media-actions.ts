"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mediaInUseActionState, mediaOrphanActionState, type MediaDeleteActionState } from "@/lib/media/delete-state";
import { processMediaUploadFile, type MediaUploadAdapter, type MediaUploadFileResult } from "@/lib/media/upload-core";
import { parseFocalPoint } from "@/lib/media/focal-point";
import { MEDIA_BUCKET } from "@/lib/media/private-object";
import { assertAffectedRows, uuidSchema } from "@/lib/admin/form-schema";
import { loadMediaUsageMap } from "@/lib/media/usage-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mediaDeleteFailure(message: string): MediaDeleteActionState {
  return { status: "error", code: "MEDIA_DELETE_FAILED", message };
}

function mediaUploadAdapter(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): MediaUploadAdapter {
  return {
    async findBySha256(sha256) {
      const { data, error } = await supabase.from("media").select("id").eq("sha256", sha256).maybeSingle();
      if (error) throw error;
      return data ? { id: String(data.id) } : null;
    },
    async upload(path, content, contentType) {
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, content, { contentType, upsert: false });
      return error ? { error } : {};
    },
    async insert(record) {
      const { data, error } = await supabase.from("media").insert(record).select("id").single();
      return error || !data ? { error: error ?? new Error("Media insert returned no record.") } : { id: String(data.id) };
    },
    async remove(path) {
      // Supabase Storage reports failed removals in its result; it does not
      // throw. Convert that error to a rejection so upload-core can surface an
      // orphan instead of falsely claiming compensation succeeded.
      const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      if (error) throw error;
    },
  };
}

// Browser sends one image per invocation. This action deliberately accepts only
// `file`; accepting `files` again would let callers aggregate all bytes into a
// single Server Action body and bypass transport-size guarantees.
export async function uploadMedia(formData: FormData): Promise<MediaUploadFileResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, filename: "", code: "INVALID_UPLOAD_REQUEST", message: "Pilih satu gambar untuk diunggah." };
  }
  const supabase = await createServerSupabaseClient();
  const result = await processMediaUploadFile(file, mediaUploadAdapter(supabase), {
    title: String(formData.get("title") ?? ""),
    altText: String(formData.get("alt_text") ?? ""),
  });
  if (result.ok) {
    revalidatePath("/admin/media");
    revalidatePath("/");
  }
  return result;
}

export async function deleteMediaWithFeedback(_previousState: MediaDeleteActionState, formData: FormData): Promise<MediaDeleteActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!uuidSchema.safeParse(id).success) return mediaDeleteFailure("Gambar ini tidak dapat diidentifikasi. Muat ulang halaman lalu coba lagi.");

  const supabase = await createServerSupabaseClient();
  const { data: media, error: mediaError } = await supabase.from("media").select("bucket,storage_path").eq("id", id).maybeSingle();
  if (mediaError || !media) return mediaDeleteFailure("Gambar ini sudah tidak tersedia untuk dihapus.");

  let references;
  try {
    references = (await loadMediaUsageMap()).get(id) ?? [];
  } catch {
    return mediaDeleteFailure("Penggunaan gambar ini tidak dapat diverifikasi. Tidak ada yang dihapus.");
  }
  if (references.length) return mediaInUseActionState(references);

  // Metadata goes first, and the delete is only treated as done when the
  // database confirms which row it removed. Removing the object first left a
  // Media Library row pointing at bytes that no longer existed whenever the
  // database delete then failed; and a delete with no returned row (RLS, or a
  // concurrent delete) must not be followed by a Storage removal that would
  // destroy bytes still referenced by a surviving row.
  const { data: deleted, error: deleteError } = await supabase.from("media").delete().eq("id", id).select("id,bucket,storage_path");
  if (deleteError) return mediaDeleteFailure("Catatan gambar tidak dapat dihapus dari Pustaka Media. Tidak ada yang dihapus.");
  const deletedRows = deleted ?? [];
  if (deletedRows.length !== 1) return mediaDeleteFailure("Catatan gambar tidak dapat dihapus dari Pustaka Media. Tidak ada berkas yang dihapus dari Storage.");

  // The bucket comes from this application, not from the row: `bucket` is an
  // editor-writable column, and a row edited to name another bucket would aim
  // this removal at objects the Media Library does not own. A row that does not
  // name our own bucket keeps its bytes and is reported as an orphan instead.
  // Both branches below describe the same terminal fact: the row is gone and its
  // object is not. That is `MEDIA_DELETE_ORPHANED`, not the generic failure code
  // — the generic one means nothing changed and the operator may retry, and
  // retrying a row that no longer exists can only produce a second, misleading
  // error.
  const removedRow = deletedRows[0];
  if (String(removedRow.bucket) !== MEDIA_BUCKET) {
    revalidatePath("/admin/media");
    revalidatePath("/");
    return {
      status: "error",
      code: "MEDIA_DELETE_ORPHANED",
      message: "Catatan gambar sudah dihapus dari Pustaka Media, tetapi berkasnya berada di luar penyimpanan Chatten sehingga tidak dihapus dan tertinggal sebagai berkas yatim di bucket " + String(removedRow.bucket) + ". Minta administrator memeriksanya, lalu muat ulang halaman ini.",
    };
  }
  const storageResult = await supabase.storage.from(MEDIA_BUCKET).remove([String(removedRow.storage_path)]);
  revalidatePath("/admin/media");
  revalidatePath("/");
  if (storageResult.error) {
    return mediaOrphanActionState(String(removedRow.storage_path));
  }
  // A success used to return a bare status with no message, and the control
  // rendered messages only for `status === "error"` — so the one outcome the
  // operator most needed confirmed was the only one that said nothing at all.
  return { status: "success", message: "Gambar dihapus dari Pustaka Media dan Storage." };
}

// Every field here is optional. An uploaded image is usable immediately; this
// screen only refines it — a better title, alt text for search engines and
// screen readers, a focal point so the crop keeps the subject in frame.
export async function saveMediaDetails(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id") ?? "");
  if (!uuidSchema.safeParse(id).success) throw new Error("Detail media tidak valid.");

  const payload = {
    title: String(formData.get("title") ?? "").trim() || null,
    alt_text: String(formData.get("alt_text") ?? "").trim() || null,
    caption: String(formData.get("caption") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    ...parseFocalPoint(formData.get("focal_x"), formData.get("focal_y")),
  };
  const { error, count } = await supabase.from("media").update(payload, { count: "exact" }).eq("id", id);
  if (error) throw new Error("Detail media gagal disimpan.");
  assertAffectedRows(count, 1, "Media tidak ditemukan atau tidak boleh diubah.");

  revalidatePath("/admin/media");
  revalidatePath("/");
  redirect(`/admin/media/items/${id}?saved=1`);
}
