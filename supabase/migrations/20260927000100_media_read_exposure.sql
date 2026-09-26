-- Audit remediation A93.
--
-- Tiga lubang baca pada lapisan media, semuanya warisan dan semuanya masih
-- terbuka hari ini. Belum diterapkan ke instans bersama; lihat catatan proses
-- migrasi di docs/TODO.md.
--
-- 1. `public_media` pada chatten_cafe.media adalah `for select using (true)`.
--    20260921000100 memasangnya sebagai `rights_status = 'approved'`, lalu
--    20260921000500_remove_media_rights_approval.sql membuka penuh saat kolom
--    itu dibuang. Keputusan yang diambil waktu itu benar — gambar yang sudah
--    diunggah memang boleh tampil — tetapi cara pelaksanaannya kelewat luas:
--    yang dibuka bukan hanya baris yang dipakai halaman publik, melainkan
--    setiap baris pustaka, dengan setiap kolomnya. Pemanggil anonim dapat
--    membaca `original_filename`, `storage_path`, `sha256`, `mime_type`,
--    `file_size`, dan `uploaded_by` (sebuah auth.users id) untuk seluruh
--    pustaka, termasuk gambar draf yang belum pernah dipakai di mana pun.
--
-- 2. `"chatten public read"` pada storage.objects adalah
--    `using (bucket_id = 'chatten-media')` tanpa syarat apa pun. Itu tidak
--    berbahaya hari ini hanya karena 20260921000400 membuat bucket privat —
--    dan itu bukan pengaman, itu kebetulan. Siapa pun yang mengembalikan
--    `public = true` (mis. lewat Studio, untuk "mempermudah pengembangan")
--    langsung membuka seluruh bucket ke internet tanpa satu pun kebijakan
--    yang menolak.
--
-- 3. Bucket `chatten-media` perlu ditegaskan kembali privat di akhir, supaya
--    berkas migrasi ini menjadi satu pernyataan utuh tentang keadaan yang
--    diinginkan, bukan bergantung pada berkas lain yang sudah jalan.
--
-- Yang TIDAK berubah: jalur bita. app/api/media/[id]/route.ts mencari
-- barisnya dengan klien yang terikat sesi pemanggil, jadi kebijakan di bawah
-- ini ikut berlaku di sana, lalu baru mengunduh objek dengan service role.
-- Tidak ada satu pun permukaan publik yang membaca `bucket` atau
-- `storage_path`; gambar dialamatkan dengan id (lib/media/url.ts).

-- ---------------------------------------------------------------------------
-- 1a. Baris: hanya media yang benar-benar dirujuk konten yang terlihat.
-- ---------------------------------------------------------------------------
--
-- Subkueri di bawah ini ikut dievaluasi di bawah RLS peran pemanggil, jadi
-- tidak perlu mengulang `is_active and status = 'published'` di sini: bagi
-- `anon`, `public_content` pada tabel yang dirujuk sudah menyaringnya. Bagi
-- editor, `cms_manage` pada chatten_cafe.media tetap permisif dan di-OR-kan,
-- sehingga Pustaka Media di CMS tetap utuh — termasuk gambar yang belum
-- dipakai, yang justru harus terlihat agar bisa dipilih.
--
-- seo_settings sengaja ikut: kebijakannya `using (true)` dan gambar Open Graph
-- memang harus dapat dibaca oleh crawler.
drop policy if exists public_media on chatten_cafe.media;

create policy public_media on chatten_cafe.media
  for select
  using (
    exists (select 1 from chatten_cafe.hero_slides r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.moments r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.about_sections r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.experiences r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.spaces r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.menu_items r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.gallery_items r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.promotions r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.events r where r.image_media_id = media.id)
    or exists (select 1 from chatten_cafe.seo_settings r where r.og_media_id = media.id)
  );

-- ---------------------------------------------------------------------------
-- 1b. Kolom: RLS tidak dapat menyembunyikan kolom, jadi hak SQL yang dipakai.
-- ---------------------------------------------------------------------------
--
-- `grant select on all tables ... to anon` di 20260909000100 memberi seluruh
-- kolom. Sebuah kebijakan baris tidak dapat mempersempitnya — itu dua
-- mekanisme berbeda. Enam kolom di bawah ini adalah seluruh yang dibaca
-- permukaan publik (lib/public-data/types.ts, lib/homepage/types.ts):
-- `id` untuk /api/media/[id], `alt_text` untuk teks alternatif, `width`/
-- `height` untuk rasio, `focal_x`/`focal_y` untuk titik fokus crop.
--
-- Akibatnya `select("*")` sebagai anon akan ditolak, jadi kueri publik
-- menyebut kolomnya satu per satu. Itu perubahan yang menyertai migrasi ini,
-- bukan efek samping: lihat lib/public-data/queries.ts dan lib/homepage/data.ts.
revoke select on chatten_cafe.media from anon;

grant select (id, alt_text, width, height, focal_x, focal_y)
  on chatten_cafe.media to anon;

-- `authenticated` tetap memegang seluruh kolom: layar Pustaka Media membaca
-- `original_filename`, `mime_type`, `file_size`, dan `sha256`, dan RLS
-- (`cms_manage`, butuh peran editor) yang memutuskan siapa boleh melihatnya.

-- ---------------------------------------------------------------------------
-- 2. Kebijakan baca anonim Storage warisan dibuang, bukan dipersempit.
-- ---------------------------------------------------------------------------
--
-- Tidak ada pemanggil yang sah untuk kebijakan ini. Bita publik mengalir
-- lewat app/api/media/[id]/route.ts, yang mengunduh dengan service role —
-- dan service role memiliki BYPASSRLS, jadi ia tidak bergantung pada
-- kebijakan mana pun di storage.objects. CMS memakai
-- `"chatten cms manage"` (butuh peran editor), yang tidak disentuh di sini.
drop policy if exists "chatten public read" on storage.objects;

-- ---------------------------------------------------------------------------
-- 3. Bucket ditegaskan privat.
-- ---------------------------------------------------------------------------
--
-- Dengan `public = true`, storage-api menyajikan /object/public/... tanpa
-- mengevaluasi RLS sama sekali — kebijakan di atas tidak akan pernah dibaca.
-- Itu sebabnya baris ini ada meski 20260921000400 sudah menjalankannya.
update storage.buckets set public = false where id = 'chatten-media';
