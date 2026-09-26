# Release Checklist

- [ ] Production domain configured
- [x] Production runtime environment strategy verified
- [x] Initial super_admin assigned
- [ ] Real Chatten imagery uploaded
- [ ] Contact / directions verified
- [ ] Opening hours verified
- [ ] SEO identity verified
- [x] Docker container healthy
- [x] Database backup restore drill verified
- [ ] Media backup verified
- [x] Admin login verified with CMS role
- [x] Public smoke test verified

- [x] Self-hosted Supabase TLS trust gate verified
- [x] chatten_cafe service_role PostgREST privilege gate verified
- [x] Admin bootstrap idempotency verified for authorized operator

- [ ] Authenticated browser E2E confirmed by operator
- [x] Operator-assisted Auth E2E tooling prepared

## Verifikasi login CMS (2026-09-27)

Diperiksa di peramban sungguhan dengan akun uji yang disediakan operator —
kredensialnya **tidak dicatat di repositori mana pun**, sesuai aturan "jangan
pernah commit rahasia". Yang diverifikasi:

- Akun itu memegang peran `super_admin` dan merupakan **satu-satunya** pemegang
  peran di `chatten_cafe.user_roles`, sehingga baris "Initial super_admin
  assigned" dan "Admin login verified with CMS role" dicentang.
- Login lewat `/admin/login` berhasil dan mengarah ke `/admin`; tujuh layar CMS
  (`/admin`, `media`, `gallery`, `menu`, `users`, `homepage`, `account`)
  menjawab 200.
- Verifikasi inilah yang memunculkan A100: seluruh thumbnail CMS gelap karena
  pengoptimal gambar mengambil tanpa cookie sesi. Tidak akan terlihat tanpa
  benar-benar login, dan tidak terlihat oleh satu pun pemeriksaan `curl`
  sebelumnya.

Baris "Authenticated browser E2E confirmed by operator" sengaja **belum**
dicentang: pengujiannya dijalankan di sini, bukan dikonfirmasi oleh operator.

### Siklus CRUD terautentikasi (A102)

Satu siklus penuh di `/admin/events` sebagai `super_admin` di peramban sungguhan:
buat → ubah → hapus, semuanya diverifikasi lewat pemuatan ulang daftar dan bukan
lewat pesan sukses di layar, dengan **nol** respons ≥ 400. Ditambah 41/41 uji
urutan fokus Playwright terhadap container yang sudah dibangun ulang.

Baris uji yang dibuat sudah dihapus; satu sisa dari lari sebelumnya yang gagal
(`audit-uji-1790454753177`, `draft`) dihapus dengan sasaran `id` persis.
`chatten_cafe.events` kembali 0 baris — tidak ada satu pun data nyata yang
disentuh.

## Gerbang otomatis

`.github/workflows/ci.yml` menjalankan uji, pemeriksaan tipe, pemeriksaan gaya,
dan build produksi pada setiap PR ke `main` serta setiap push ke `main` dan
`dev-maskhar`. Sebelum ini, satu-satunya bukti kesehatan sebuah PR adalah
verifikasi manual di mesin lokal, yang tidak terlihat oleh peninjau.

> **DINONAKTIFKAN SEMENTARA (2026-09-27).** Akun GitHub terkunci karena masalah
> tagihan, sehingga setiap job ditolak runner sebelum mulai ("The job was not
> started because your account is locked due to a billing issue") dan setiap
> push menghasilkan check merah yang bukan kegagalan kode. Atas keputusan
> operator, workflow dimatikan lewat `gh workflow disable CI` — berkasnya
> sengaja tidak dihapus. Selama mati, keempat gerbang dijalankan manual di
> mesin lokal sebelum setiap push. Setelah tagihan beres, nyalakan lagi dengan:
>
> ```
> gh workflow enable CI --repo maskhar/chatten_project
> ```
>
> lalu pastikan run pertama hijau sebelum mencentang kembali baris proteksi
> branch di bawah.

- [x] CI menjalankan `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [x] Langkah uji memeriksa baris ringkasan `ℹ fail` sebagai pengaman di atas exit code
- [x] Build CI memakai `NEXT_PUBLIC_APP_URL` placeholder, jadi gerbang A47 diuji pada jalur suksesnya
- [x] CI berjalan pada Node 24, sama dengan `Dockerfile`
- [ ] Proteksi branch `main` mewajibkan check CI lulus sebelum merge

Catatan: CI sengaja tidak memakai satu pun secret. Uji bersifat murni dan
`next build` tidak menghubungi Supabase, sehingga kredensial di CI hanya akan
memperluas permukaan kebocoran tanpa menambah jaminan. Proteksi branch adalah
setelan repositori di GitHub, bukan berkas di repo, jadi baris terakhir harus
diaktifkan lewat Settings → Branches.
