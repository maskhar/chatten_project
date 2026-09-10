"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { mediaInUseActionState, type MediaDeleteActionState } from "@/lib/media/delete-state";
import { loadMediaUsageMap } from "@/lib/media/usage-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mediaDeleteFailure(message: string): MediaDeleteActionState {
  return { status: "error", code: "MEDIA_DELETE_FAILED", message };
}

export async function uploadMedia(formData: FormData) { await requireAdmin(); const file = formData.get("file"); if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Upload an image under 10 MB."); const supabase = await createServerSupabaseClient(); const path = crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const upload = await supabase.storage.from("chatten-media").upload(path, file, { contentType: file.type, upsert: false }); if (upload.error) throw new Error("Unable to upload media."); const { error } = await supabase.from("media").insert({ bucket: "chatten-media", storage_path: path, original_filename: file.name, mime_type: file.type, file_size: file.size, alt_text: String(formData.get("alt_text") ?? "") || null, title: String(formData.get("title") ?? file.name), source_type: "operator-upload", rights_status: "unknown" }); if (error) { await supabase.storage.from("chatten-media").remove([path]); throw new Error("Unable to save media metadata."); } revalidatePath("/admin/media"); revalidatePath("/"); }

export async function deleteMediaWithFeedback(_previousState: MediaDeleteActionState, formData: FormData): Promise<MediaDeleteActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: media, error: mediaError } = await supabase.from("media").select("bucket,storage_path").eq("id", id).maybeSingle();
  if (mediaError || !media) return mediaDeleteFailure("This image is no longer available for deletion.");
  let references;
  try {
    references = (await loadMediaUsageMap()).get(id) ?? [];
  } catch {
    return mediaDeleteFailure("Unable to verify whether this image is in use. Nothing was deleted.");
  }
  if (references.length) return mediaInUseActionState(references);
  const storageResult = await supabase.storage.from(String(media.bucket)).remove([String(media.storage_path)]);
  if (storageResult.error) return mediaDeleteFailure("Unable to remove this image from Storage. Nothing was deleted.");
  const { error: deleteError } = await supabase.from("media").delete().eq("id", id);
  if (deleteError) return mediaDeleteFailure("Image was removed from Storage but its Media Library record could not be removed.");
  revalidatePath("/admin/media");
  revalidatePath("/");
  return { status: "success" };
}

export async function saveMediaDetails(formData:FormData){const user=await requireAdmin();const supabase=await createServerSupabaseClient();const id=String(formData.get('id')??'');const rights=String(formData.get('rights_status')??'unknown');if(!/^[0-9a-f-]{36}$/i.test(id)||!['approved','unknown','restricted'].includes(rights))throw new Error('Invalid media details.');const {data:role}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle();if(rights!=='unknown'&&role?.role!=='super_admin'&&role?.role!=='admin')throw new Error('Only administrators can change media rights.');const payload={title:String(formData.get('title')??'').trim()||null,alt_text:String(formData.get('alt_text')??'').trim()||null,caption:String(formData.get('caption')??'').trim()||null,category:String(formData.get('category')??'').trim()||null,tags:String(formData.get('tags')??'').split(',').map(value=>value.trim()).filter(Boolean),source_type:String(formData.get('source_type')??'').trim()||null,source_reference:String(formData.get('source_reference')??'').trim()||null,attribution:String(formData.get('attribution')??'').trim()||null,rights_status:rights};const {error}=await supabase.from('media').update(payload).eq('id',id);if(error)throw new Error('Unable to save media details.');revalidatePath('/admin/media');}
