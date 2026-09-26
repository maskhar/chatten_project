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

Media deletion rechecks current structured references on server immediately before Storage removal. Referenced Media is rejected with human-readable usage count and the same resource/title context shown by Media Detail `Used In`, including SEO through `og_media_id`. Unused Media keeps exact Storage-object removal followed by exact database-row deletion.

## Multi-file Upload Core

`lib/media/upload-core.ts` processes up to 20 selected images sequentially and independently. Each file receives server-side signature validation, a 10 MB per-file limit, SHA-256 duplicate detection, and an individual result, so invalid or failed files do not roll back valid siblings. Normal uploads create `operator-upload` Media records; client-supplied metadata outside the upload form is ignored. Storage upload must succeed before Media insertion, and a failed insertion attempts removal of the exact uploaded Storage object. Multi-file selection, Drag & Drop, and per-file queue UI wiring are complete.
