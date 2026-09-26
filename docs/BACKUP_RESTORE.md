# Backup and Restore

## Database

Run backups from the self-hosted Supabase Docker directory. Create a custom-format dump limited to `chatten_cafe`, store it outside the host's temporary directory, encrypt it at rest, and retain it under operator policy.

```bash
docker exec supabase-db pg_dump -U postgres -Fc -n chatten_cafe postgres > chatten_cafe_YYYYMMDD.dump
```

Restore only into an isolated drill database first. The drill needs minimal `auth.users` and `auth.uid()` compatibility because application foreign keys and RLS policies reference Supabase Auth. Never restore into production without an approved recovery plan.

## Media

Back up the configured self-hosted Storage object backend and `chatten_cafe.media` metadata together. Verify object paths and metadata remain synchronized before a restore. Do not treat a PostgreSQL dump as a media backup.

Media Chatten tersebar di **tiga** tempat yang harus dicadangkan pada satu titik
yang konsisten. Melewatkan salah satunya menghasilkan cadangan yang tampak
lengkap tetapi menjawab 404 setelah dipulihkan:

| Bagian | Isinya | Di mana |
| --- | --- | --- |
| `chatten_cafe.media` | metadata aplikasi: judul, `alt_text`, `sha256`, titik fokus | dump `pg_dump -n chatten_cafe` |
| `storage.objects` + `storage.buckets` | baris yang membuat objek dapat dialamatkan, termasuk `version` | **di luar** skema `chatten_cafe`, jadi tidak ikut dump di atas |
| byte berkas | isi gambar yang sebenarnya | bind mount host, `STORAGE_BACKEND: file` |

**Jebakan yang menentukan.** Byte disimpan pada berkas yang bernama
`storage.objects.version` (sebuah UUID), bukan bernama objeknya:

```
volumes/storage/stub/stub/chatten-media/operator/<nama-objek>/<version-uuid>
```

Jadi menyalin direktori berkas **tanpa** baris `storage.objects` dari titik yang
sama akan menghasilkan objek yang ada di disk tetapi tidak dapat dialamatkan —
storage-api mencari UUID versi yang tidak lagi cocok. Karena `storage.objects`
ada di luar `chatten_cafe`, satu-satunya cara agar ikut tercadangkan adalah
mengambilnya secara eksplisit.

```bash
V=~/docker/supabase/supabase-1.26.05/docker/volumes/storage
cd ~/docker/supabase/supabase-1.26.05/docker

docker compose exec -T db pg_dump -U postgres -Fc -n chatten_cafe postgres > chatten_cafe.dump
docker compose exec -T db psql -U postgres -d postgres -At -c "copy (select id,bucket_id,name,version,owner,created_at,updated_at,metadata from storage.objects where bucket_id='chatten-media') to stdout with (format csv, header)" > storage_objects_chatten.csv
docker compose exec -T db psql -U postgres -d postgres -At -c "copy (select * from storage.buckets where id='chatten-media') to stdout with (format csv, header)" > storage_bucket_chatten.csv
tar -czf chatten-media-objects.tar.gz -C "$V" stub/stub/chatten-media
```

Catat bahwa kueri `storage.objects` dibatasi ke `bucket_id = 'chatten-media'`.
Instance ini bersama beberapa tenant; mencadangkan seluruh tabel berarti membawa
metadata penyewa lain ke dalam arsip Chatten.

**Memverifikasi cadangan, bukan hanya membuatnya.** Sebuah arsip yang bisa
dibuka belum berarti byte-nya benar. `chatten_cafe.media.sha256` memberi
pembanding independen — ekstrak arsipnya ke direktori sementara, lalu untuk
setiap objek bandingkan `sha256sum` berkas bernama `version` dengan `sha256` di
metadata. Selisih apa pun berarti kerusakan yang tidak akan terlihat sampai
seseorang membuka gambarnya.

## Verified Drill

On September 9, 2026, an isolated `chatten_cafe` dump/restore drill succeeded: 20 application tables restored, then the temporary drill database and dump were removed.

### Drill media (2026-09-27)

Dijalankan penuh dengan prosedur di atas, lalu **diverifikasi isinya**:

- Backend penyimpanan dikonfirmasi `STORAGE_BACKEND: file` dengan bind mount
  `volumes/storage → /var/lib/storage`; 11G untuk seluruh tenant, 31G bebas di
  host. Bucket Chatten `chatten-media` bersifat privat (`public = f`).
- Keselarasan metadata↔objek diuji **dua arah**: 0 baris `chatten_cafe.media`
  tanpa objek storage, dan 0 objek `chatten-media` tanpa baris metadata. 5 objek,
  semuanya punya `sha256`.
- Arsip diekstrak ke direktori terpisah: 5 dari 5 berkas hadir dan
  **`sha256` byte-nya cocok seluruhnya** dengan metadata (`cocok=5 gagal=0`).
- Dump diperiksa isinya dengan `pg_restore -l`: 241 entri termasuk
  `TABLE DATA chatten_cafe media`. (Catatan praktis: `pg_restore -l /dev/stdin`
  di balik `docker compose exec -T` menjawab kosong karena stdin sudah dipakai
  compose — pakai `docker cp` lalu baca berkasnya di dalam kontainer.)
- Seluruh artefak drill dihapus sesudahnya; volume sumber tetap 5 berkas, tidak
  tersentuh.
