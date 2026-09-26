-- Mempersempit kebijakan "Public Access" pada storage.objects.
--
-- Kebijakan ini BUKAN milik proyek Chatten. Ia ada di tabel bersama sebuah
-- instance Supabase swakelola yang dipakai banyak tenant, dan berkas ini
-- disimpan di ops/ — bukan supabase/migrations/ — justru karena itu: migrasi
-- Chatten hanya boleh menyentuh skema chatten_cafe dan bucket miliknya.
--
-- Mengapa dipersempit. Definisi lamanya `using (true)` tanpa batas bucket, dan
-- perannya PUBLIC, sehingga ia memberi hak baca atas objek di SELURUH 25 bucket
-- instance kepada siapa pun yang memegang kunci anon mana pun — dan kunci anon
-- tertanam di bundel peramban setiap pengunjung, jadi sifatnya publik.
-- Dibuktikan dengan kunci anon Chatten pada 2026-09-27:
--   GET /storage/v1/object/authenticated/release-invoices/<uid>/…/SPB-….pdf → 200
--   POST /storage/v1/object/list/release-invoices                          → 200
-- yakni faktur PDF per-pengguna milik tenant SoundPub terbaca dan isi bucket
-- privatnya dapat dienumerasi. Delapan bucket privat lain punya kebijakan
-- sendiri yang jauh lebih ketat; `Public Access` membatalkan semuanya karena
-- kebijakan permisif di-OR-kan.
--
-- Mengapa daftar bucket publik, bukan dihapus. Jalur /object/public/<bucket>/
-- tidak mengevaluasi RLS sama sekali untuk bucket `public = true` — diverifikasi
-- dengan mengambil objek bucket `gallery` tanpa kunci apa pun (200). Jadi akses
-- publik yang sah tidak bergantung pada kebijakan ini. Tetapi delapan bucket
-- publik tidak punya kebijakan baca sendiri (article, blog-covers, contracts,
-- learning, lelanganproperti, mentor, school-logo, template), sehingga
-- menghapus kebijakan ini akan mematahkan tenant yang membacanya lewat jalur
-- /object/authenticated/ atau /object/list/. Mempertahankan tepat bucket yang
-- sudah `public = true` menutup kebocoran tanpa mengubah satu pun perilaku yang
-- saat ini sah.
--
-- Daftarnya adalah ke-16 bucket dengan `public = true` pada 2026-09-27. Ia
-- sengaja literal, bukan subkueri ke storage.buckets: sebuah kebijakan yang
-- membaca `public` akan ikut membuka bucket privat mana pun yang kelak
-- dijadikan publik oleh tenant lain tanpa keputusan sadar siapa pun.
--
-- Pemulihan bila ada tenant yang patah — satu perintah:
--   drop policy "Public Access" on storage.objects;
--   create policy "Public Access" on storage.objects for select using (true);

drop policy if exists "Public Access" on storage.objects;

create policy "Public Access"
  on storage.objects
  for select
  using (
    bucket_id in (
      '3d-models',
      'article',
      'audio-clips',
      'avatars',
      'blog-covers',
      'contracts',
      'daily-report',
      'gallery',
      'iccn-gallery',
      'label-logos',
      'learning',
      'lelanganproperti',
      'mentor',
      'school-logo',
      'task',
      'template'
    )
  );
