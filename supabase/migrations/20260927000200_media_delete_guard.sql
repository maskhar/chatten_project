-- Audit remediation A94.
--
-- Menghapus baris chatten_cafe.media yang masih dipakai konten saat ini
-- berhasil di tingkat basis data, dan diam-diam mengosongkan gambar pada
-- setiap baris yang merujuknya.
--
-- Itu akibat langsung 20260921000500_database_integrity.sql: sepuluh foreign
-- key dipasang dengan `on delete set null`. Pilihan itu benar untuk masalah
-- yang diselesaikannya — sebelum itu kolomnya `uuid` biasa, jadi media yang
-- dihapus meninggalkan id menggantung yang gagal dirender — tetapi ia juga
-- mengubah penghapusan yang seharusnya ditolak menjadi penghapusan yang
-- berhasil dengan kerusakan tersebar. Satu `delete from media` dapat
-- mengosongkan gambar hero, empat item menu, dan gambar Open Graph sekaligus,
-- tanpa satu pun galat.
--
-- Perlindungan satu-satunya hari ini ada di aplikasi: deleteMediaWithFeedback
-- memuat peta penggunaan lalu menolak (lib/admin/media-actions.ts). Itu
-- memang lapisan yang benar untuk *pesannya* — ia dapat menyebut konten mana
-- yang memakai gambar itu — tetapi ia bukan batas. Token sesi CMS bekerja
-- tanpa Server Action: `DELETE /rest/v1/media?id=eq.<uuid>` lewat PostgREST
-- melewatinya sepenuhnya, dan `cms_manage` mengizinkannya untuk peran editor.
-- Ada juga balapan yang tidak dapat ditutup di aplikasi: peta penggunaan
-- dibaca, lalu baris konten baru menunjuk gambar itu, lalu penghapusan
-- berjalan.
--
-- Trigger di bawah ini menutup keduanya. Ia BEFORE DELETE, jadi ia menolak
-- sebelum `on delete set null` sempat menyentuh apa pun.

create or replace function chatten_cafe.refuse_delete_media_in_use()
returns trigger
language plpgsql
security definer
set search_path = chatten_cafe, pg_temp
as $$
declare
  usage_count integer;
begin
  -- SECURITY DEFINER, dan ini satu-satunya tempat di skema ini yang memakainya
  -- dengan sengaja. Sebagai INVOKER, hitungan di bawah berjalan di bawah RLS
  -- pemanggil: baris konten yang tidak terlihat bagi peran itu tidak
  -- terhitung, sehingga trigger melaporkan "tidak dipakai" untuk gambar yang
  -- jelas dipakai. Sebuah pengaman yang bergantung pada visibilitas pemanggil
  -- bukan pengaman.
  --
  -- Fungsi ini tidak membaca input pemanggil dan tidak menulis apa pun; ia
  -- hanya menghitung. search_path dipatok agar nama tabel tidak dapat
  -- dibelokkan oleh search_path sesi.
  select count(*) into usage_count from (
    select 1 from chatten_cafe.hero_slides where image_media_id = old.id
    union all select 1 from chatten_cafe.moments where image_media_id = old.id
    union all select 1 from chatten_cafe.about_sections where image_media_id = old.id
    union all select 1 from chatten_cafe.experiences where image_media_id = old.id
    union all select 1 from chatten_cafe.spaces where image_media_id = old.id
    union all select 1 from chatten_cafe.menu_items where image_media_id = old.id
    union all select 1 from chatten_cafe.gallery_items where image_media_id = old.id
    union all select 1 from chatten_cafe.promotions where image_media_id = old.id
    union all select 1 from chatten_cafe.events where image_media_id = old.id
    union all select 1 from chatten_cafe.seo_settings where og_media_id = old.id
  ) as refs;

  if usage_count > 0 then
    -- errcode 23503 (foreign_key_violation) dipilih dengan sengaja: inilah
    -- yang akan terjadi bila kesepuluh foreign key itu `on delete restrict`
    -- sejak awal, dan PostgREST memetakannya ke HTTP 409 Conflict — bukan 500.
    -- Pemetaan ke pesan operator ada di lib/media/delete-state.ts.
    raise exception 'Media % is referenced by % content row(s)', old.id, usage_count
      using errcode = '23503',
            hint = 'MEDIA_IN_USE';
  end if;

  return old;
end $$;

-- Pemilik fungsi SECURITY DEFINER adalah peran yang menjalankan migrasi ini.
-- `revoke ... from public` bukan sekadar kebersihan di sini: fungsi trigger
-- tidak perlu dapat dipanggil langsung oleh siapa pun.
revoke all on function chatten_cafe.refuse_delete_media_in_use() from public;

drop trigger if exists media_refuse_delete_in_use on chatten_cafe.media;

create trigger media_refuse_delete_in_use
  before delete on chatten_cafe.media
  for each row
  execute function chatten_cafe.refuse_delete_media_in_use();
