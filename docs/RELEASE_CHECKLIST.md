# Release Checklist

- [ ] Production domain configured
- [x] Production runtime environment strategy verified
- [ ] Initial super_admin assigned
- [ ] Real Chatten imagery uploaded
- [ ] Contact / directions verified
- [ ] Opening hours verified
- [ ] SEO identity verified
- [x] Docker container healthy
- [x] Database backup restore drill verified
- [ ] Media backup verified
- [ ] Admin login verified with CMS role
- [x] Public smoke test verified

- [x] Self-hosted Supabase TLS trust gate verified
- [x] chatten_cafe service_role PostgREST privilege gate verified
- [x] Admin bootstrap idempotency verified for authorized operator

- [ ] Authenticated browser E2E confirmed by operator
- [x] Operator-assisted Auth E2E tooling prepared

## Gerbang otomatis

`.github/workflows/ci.yml` menjalankan uji, pemeriksaan tipe, pemeriksaan gaya,
dan build produksi pada setiap PR ke `main` serta setiap push ke `main` dan
`dev-maskhar`. Sebelum ini, satu-satunya bukti kesehatan sebuah PR adalah
verifikasi manual di mesin lokal, yang tidak terlihat oleh peninjau.

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
