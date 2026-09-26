# Media Workflow

Chatten imagery enters through operator-approved local files or explicitly approved HTTPS sources. Google Maps, Instagram, press, and other public image URLs are discovery references only unless reuse rights are explicitly approved. This is an editorial policy; the database no longer carries a rights column that enforces it.

## Import

1. Add rights-cleared items to `content/chatten-media-import.json`.
2. Set source metadata, category, title, and alt text. The manifest no longer carries a rights column; `rights_status` was dropped in `supabase/migrations/20260921000500_remove_media_rights_approval.sql`.
3. Dry run:

```powershell
npm run media:import -- --manifest content/chatten-media-import.json --dry-run
```

4. Import approved items:

```powershell
npm run media:import -- --manifest content/chatten-media-import.json
```

Importer validates image signatures, MIME, size, SHA-256 duplicates, and writes to `chatten-media/site/<category>/`. It never prints credentials. Imported assets retain source and rights metadata.

## CMS

Pustaka Media menampilkan thumbnail Storage, dimensi, ukuran berkas, dan jumlah penggunaan. Gambar yang berhasil diunggah operator langsung masuk ke Pustaka Media dan dapat digunakan. Media yang masih dirujuk konten tidak dapat dihapus sampai setiap referensi konten diganti.

## Ownership

`chatten_cafe.media` is durable metadata. Content stores `image_media_id`; SEO stores Open Graph reference in `og_media_id`. Rights clearance for external/imported assets is an editorial policy enforced before adding an item to the import manifest; no `rights_status` publication gate remains in the schema.

## Picker

Modul editorial dengan `image_media_id` menggunakan komponen Media Picker visual bersama (`components/admin/media-picker.tsx`). Picker memuat gambar yang tersedia dari server. Operator dapat mencari berdasarkan judul, teks alt, atau kategori; memfilter dengan daftar kategori; serta menggabungkan pencarian dan kategori dengan logika AND. Gambar terpilih menampilkan indikator **Terpilih** dan cincin visual. Tindakan **Ganti** dan **Hapus pilihan** mengosongkan pilihan tanpa perlu memasukkan UUID. Jika belum ada gambar, picker menampilkan **Belum ada gambar** dengan tautan langsung **Buka Pustaka Media**, yang mengarahkan operator untuk mengunggah gambar. Bila hasil habis karena filter, picker menampilkan **Tidak ada gambar yang sesuai dengan filter.** dengan tindakan **Bersihkan filter**. Alur kerjanya: Unggah → Pilih melalui Media Picker.

## Structured Usage Core

`lib/media/usage.ts` provides pure structured Media usage aggregation for CMS content and SEO `og_media_id` references.

## Structured Usage Database Wiring

`lib/media/usage-server.ts` loads batched, read-only resource rows through the server Supabase client and feeds them once into `buildMediaUsageMap`. It performs no per-Media N+1 queries. Pustaka Media counts and deletion safety derive from structured reference arrays. SEO selects `og_media_id`; Media Detail renders the same references under the `Digunakan di` heading.

## Human-readable Delete Protection

Media deletion rechecks current structured references on server immediately before Storage removal. Referenced Media is rejected with human-readable usage count and the same resource/title context shown by Media Detail `Used In`, including SEO through `og_media_id`.

Unused Media deletes the metadata row first and removes the Storage object only after the database confirms exactly one deleted row. Removing the object first left a library row pointing at bytes that no longer existed whenever the row delete then failed, and a delete returning no row (RLS, or a concurrent delete) must not be followed by a removal that destroys bytes a surviving row still references. A row that names a bucket other than `chatten-media` never aims the removal at that bucket: the metadata is deleted and the operator is told the file sits outside Chatten storage and needs an administrator. A failed Storage removal is reported as a named orphan, not as success.

## Serving Private Objects

The `chatten-media` bucket is private (`20260921000400`), and `app/api/media/[id]` is the application's media delivery path. The route resolves the row under the caller's RLS context, then uses the service-role client for the bytes.

Private bucket metadata alone does not replace object RLS. Migration `20260921000500_remove_media_rights_approval.sql` still contains a historical anonymous `storage.objects` SELECT policy for this bucket; narrowing that direct authenticated Storage path is separate database work and remains pending until the migration-ledger preflight is complete. A89 hardens the privileged application proxy but does not claim that database exposure is already closed.

`bucket`, `storage_path`, and `mime_type` are editor-writable columns, so `lib/media/private-object.ts` treats all three as untrusted at that privileged boundary:

- the download target is the application's own `chatten-media` constant, never the row's `bucket`, so a row edited to name another bucket cannot turn the service-role client into a confused deputy;
- `storage_path` must match an allowlist of `[A-Za-z0-9._-]` segments. Traversal (`..`), absolute paths, empty segments, and backslashes are rejected — and so is any character with URL meaning, because the path is spliced into a Storage URL where a stored `object.png#x` or `object.png?x` truncates and silently resolves to a *different* object than the row names;
- only upload-validated `image/jpeg`, `image/png`, `image/webp`, and `image/avif` are served `inline`. Every other stored MIME — including `text/html` and `image/svg+xml`, which would otherwise run as a document same-origin to the CMS session cookie — is downgraded to an `application/octet-stream` `attachment`. Responses always carry `X-Content-Type-Options: nosniff`, and the downloaded blob's own type never overrides this allowlist.

Anything rejected returns the same `404` as a nonexistent id, so probing tells an attacker nothing.

## Multi-file Upload Core

`lib/media/upload-core.ts` processes up to 20 selected images sequentially and independently. Each file receives server-side signature validation, a 10 MB per-file limit, SHA-256 duplicate detection, and an individual result, so invalid or failed files do not roll back valid siblings. Normal uploads create `operator-upload` Media records; client-supplied metadata outside the upload form is ignored. Storage upload must succeed before Media insertion, and a failed insertion attempts removal of the exact uploaded Storage object. Multi-file selection, Drag & Drop, and per-file queue UI wiring are complete.
