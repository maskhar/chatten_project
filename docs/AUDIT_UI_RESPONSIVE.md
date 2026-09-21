# Audit Tampilan, Responsif dan UI/UX

Tanggal audit: 21 September 2026 · Cakupan: 11 halaman publik + 21 halaman
dashboard + 18 komponen admin bersama.

Metode: pembacaan sumber untuk setiap halaman, ditambah pengukuran langsung di
browser pada 375×667 (iPhone SE), 375×812, 820×1180 (tablet), 1165×900 dan
1280×900. Rasio kontras dihitung dengan rumus WCAG 2.1 relative luminance.
Latar belakang diukur dengan `document.elementsFromPoint()` (hit-test pada
piksel yang benar-benar dicat), bukan dengan menelusuri nenek moyang DOM —
header publik ber-`position: absolute` di atas hero, sehingga penelusuran DOM
melaporkan latar yang salah.

Status tiap temuan: **[SUDAH DIPERBAIKI]** sudah dikerjakan pada pass ini,
**[TERBUKA]** masih perlu dikerjakan.

---

## 1. Akar masalah "teks tidak terlihat" — satu baris CSS [SUDAH DIPERBAIKI]

Ini penyebab tunggal dari seluruh keluhan tombol hijau-di-atas-hijau pada
screenshot. Bukan masalah palet warna, melainkan masalah *cascade layer*.

`app/globals.css` sebelumnya berisi aturan tanpa layer:

```css
a { color: inherit; text-decoration: none; }
```

Tailwind v4 (`@import "tailwindcss"`) menempatkan seluruh utility di dalam
`@layer utilities`. Dalam CSS, **aturan tanpa layer selalu menang atas aturan
di dalam layer mana pun, berapa pun specificity-nya.** Akibatnya selektor
elemen `a` yang sangat lemah tetap mengalahkan `.text-white`, dan setiap
`<a>`/`<Link>` di seluruh repositori membuang warna yang dideklarasikannya lalu
mewarisi warna dari nenek moyang terdekat.

`<button>` tidak tersentuh aturan itu. Itulah asimetri yang persis terlihat di
screenshot: tombol "Save changes" (sebuah `<button>`) terbaca normal, sedangkan
"Get Directions" (sebuah `<a>`) gelap di atas gelap.

Perbaikan — pindahkan aturan yang sama ke dalam `@layer base`:

```css
@layer base {
  a { color: inherit; text-decoration: none; }
}
```

Di dalam `base`, perilaku default tetap berlaku untuk anchor yang tidak
mendeklarasikan warna, tetapi utility warna sekarang menang.

Verifikasi di browser sesudah perbaikan, halaman `/`:

| Elemen | Sebelum | Sesudah |
| --- | --- | --- |
| `Get Directions` (hero, `onDark`) | `#1e3024` di atas `#1f3426` = **1.05:1** | `#ffffff` di atas `#1f3426` = **13.31:1** |
| `Explore Chatten` (hero, `accent`) | putih di atas `#e2a07a` = **2.2:1** | `#253526` di atas `#e2a07a` = **5.91:1** |
| Seluruh anchor pada `/` di bawah AA | 2 | **0** |

Anchor lain yang ikut pulih dengan perbaikan satu baris ini (sebelumnya
1.05:1–1.09:1, semuanya praktis tidak terbaca):

- `components/ui/cta.tsx:19` varian `solid` — varian default, jadi setiap
  `<CtaLink>` tanpa `variant` terdampak: `app/(public)/page.tsx:38`,
  `app/about/page.tsx:9`, `app/visit/page.tsx:10`, `app/not-found.tsx:3`
  (tombol pemulihan utama halaman 404), `app/events/[slug]/page.tsx:33`,
  `app/experience/[slug]/page.tsx:33`, `app/spaces/[slug]/page.tsx:28`.
- `components/ui/cta.tsx:20` varian `outline` — `hover:bg-[#1f3426]` berlaku
  sedangkan `hover:text-white` tidak, sehingga teks hilang **saat hover saja**.
- `components/public/skip-to-content.tsx:10` — skip link adalah target Tab
  pertama; `focus:bg` berlaku, `focus:text-white` tidak.
- Admin: `app/admin/(dashboard)/page.tsx:31`,
  `components/admin/event-promotion-manager.tsx`,
  `components/admin/gallery-manager-client.tsx`,
  `components/admin/menu-manager-client.tsx`,
  `components/admin/homepage-sortable.tsx`,
  `components/admin/experiences-manager-client.tsx:165`,
  `components/admin/media-picker.tsx:130`.

Pelindung regresi: `tests/anchor-cascade.test.mjs` membaca `app/globals.css`,
menolak `a { color: … }` tanpa layer, dan juga menolak selektor elemen lain
tanpa layer yang menyetel `color`. Test ini sudah diverifikasi dengan mutasi —
aturan tanpa layer ditambahkan kembali, test gagal dengan pesan yang benar,
lalu file dipulihkan.

---

## 2. Halaman publik — responsif dan layout

### 2.1 Hero lebih tinggi dari viewport ponsel [TERBUKA]

`app/(public)/page.tsx:28`

```
relative flex min-h-[760px] items-end bg-[#233b2a] text-white
```

Diukur pada 375×667: tinggi hero **760px = 1.14× viewport**. Pengunjung ponsel
tidak melihat satu pun bagian di bawah hero tanpa menggulir, dan karena
`items-end`, judul baru muncul di posisi `top: 352px`. Pada iPhone SE bagian
atas layar hanya berisi foto.

Saran: `min-h-[70svh] sm:min-h-[760px]`, atau turunkan nilai dasar ke sekitar
560px. `svh` lebih tepat daripada `vh` karena memperhitungkan toolbar browser
ponsel yang menyusut.

### 2.2 Padding hero tidak turun di ponsel [TERBUKA]

`app/(public)/page.tsx:28` — `pb-20 pt-44 sm:pb-28`

`pt-44` = 176px padding atas, tanpa langkah kecil untuk ponsel. Nilai ini dibuat
untuk mengosongkan ruang bagi header yang mengambang, tetapi header pada ponsel
jauh lebih pendek. Saran: `pt-28 sm:pt-44`.

### 2.3 Judul hero 48px di kolom 327px [TERBUKA — tidak sampai terpotong]

`app/(public)/page.tsx:28` — `font-serif text-5xl leading-[.9] sm:text-7xl lg:text-8xl`

Diukur pada 375×667: `font-size: 48px`, lebar kolom 327px, `scrollWidth` 327px
— **tidak ada pemotongan**, teks membungkus dengan benar. Klaim "terpotong
diam-diam oleh `overflow-x-hidden`" tidak terbukti dan tidak dimasukkan sebagai
cacat. Yang tersisa hanyalah masalah proporsi: dua baris judul memakan 130px
tinggi dan mendorong isi lain lebih jauh ke bawah. Prioritas rendah.

### 2.4 Header galeri tidak membungkus [TERBUKA]

`app/(public)/page.tsx:36` — `<div className="flex items-end justify-between gap-6">`

Baris 32 (header menu) sudah benar dengan `flex flex-wrap items-end
justify-between gap-6`; baris 36 melewatkan `flex-wrap`. Judul "Framed by Batu."
dan tautan "Explore Gallery" dipaksa satu baris. Tambahkan `flex-wrap`.

### 2.5 Dua `min-h` bertumpuk pada band feature [TERBUKA]

`app/(public)/page.tsx:31` — `min-h-[560px]` pada kartu luar, `min-h-[430px]`
pada kolom di dalamnya. Pada ponsel keduanya jauh melebihi tinggi konten,
menghasilkan ruang kosong besar. Saran: turunkan nilai dasar dan naikkan lewat
`sm:`/`lg:`.

### 2.6 Target sentuh di bawah 44px [TERBUKA]

Diukur langsung di browser pada 375×667. `components/ui/cta.tsx:15` sudah benar
— `BASE` memuat `min-h-11`, jadi setiap `CtaLink`/`CtaButton` memenuhi syarat.
Semua temuan di bawah adalah anchor mentah yang **melewati** komponen itu:

| Elemen | Tinggi terukur | Lokasi |
| --- | --- | --- |
| "Discover the Experience" | 25px | `app/(public)/page.tsx:30` |
| "View Full Menu" | 25px | `app/(public)/page.tsx:32` |
| "Explore Gallery" | 25px | `app/(public)/page.tsx:36` |
| "Explore experience" | 25px | `app/experience/page.tsx:9` |
| Logo `CHATTEN` header | 32px | `components/public/header.tsx:20` |
| Logo `CHATTEN` footer | 35px | `components/public/public-footer.tsx` |
| 8 tautan footer (`About`…`Instagram`) | 20px | `components/public/public-footer.tsx:19-20` |

Tautan footer yang paling parah: 20px tinggi, induknya `flex flex-wrap gap-x-5
gap-y-3 text-sm` hanya memberi jarak vertikal 12px, sehingga dua target 20px
berjarak 12px — jauh di bawah rekomendasi. Berlaku di seluruh situs.

Saran: tambahkan `inline-flex min-h-11 items-center` pada anchor-anchor ini,
atau untuk tiga anchor bergaris bawah pada beranda, ganti ke varian `CtaLink`
yang sudah membawa `min-h-11`.

### 2.7 Yang sudah benar (diverifikasi, bukan cacat)

- **Tidak ada overflow horizontal** pada 375×667, 375×812, 820×1180 maupun
  1165×900. `document.documentElement.scrollWidth` = 375 pada viewport 375.
- Kontras navigasi header **baik**. Pengukuran awal melaporkan 12 kegagalan
  1.16:1 pada seluruh tautan nav; itu semua **false positive** akibat metode
  pengukuran yang menelusuri nenek moyang DOM sementara header
  ber-`position: absolute` mengambang di atas hero gelap. Setelah diukur ulang
  dengan hit-test piksel, jumlahnya turun ke 2 kegagalan asli yang sudah
  diperbaiki di bagian 1.
- `components/public/media-image.tsx:31` mewajibkan prop `sizes` pada
  `<Image fill>`. Tidak ada `<img>` mentah di halaman publik.

---

## 3. Dashboard — responsif dan layout

### 3.1 Koreksi premis: navigasi mobile TIDAK rusak

Keluhan "dashboard kurang responsif" perlu dipersempit. Diverifikasi dengan klik
nyata dan screenshot pada 375px:

- `app/admin/(dashboard)/layout.tsx` — `<div className="lg:pl-64">` offset
  konten ada dan benar.
- `components/admin/admin-nav.tsx:74-139` — `AdminMobileNav` adalah hamburger +
  drawer sungguhan: overlay `fixed inset-0 z-40 lg:hidden`, panel `absolute
  inset-y-0 left-0 flex w-72 max-w-[85vw]`, handler Escape, kunci scroll body,
  tutup lewat backdrop, tutup per-tautan. Navigasi **terjangkau** pada 375px.
- `admin-nav.tsx:67` — sidebar `hidden … lg:block` dipasangkan dengan benar
  terhadap drawer. Tidak ada sidebar yatim.
- Satu-satunya tabel di dashboard sudah dibungkus dengan benar:
  `users/page.tsx` `overflow-x-auto` + `min-w-[720px]`.

Cacat yang sebenarnya ada di bawah ini.

### 3.2 KRITIS — popover edit kategori menu lepas dari pemicunya [TERBUKA]

`components/admin/menu-manager-client.tsx`

```
<form action={saveMenuCategory} className="absolute z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded border bg-white p-4 shadow">
```

Popover ini `absolute`, tetapi **tidak ada satu pun nenek moyang yang
diposisikan**. Baris di `components/admin/sortable-list.tsx:11` adalah
`flex flex-wrap items-center gap-3 … ${isDragging ? "relative z-10 shadow-lg" : ""}`
— `relative` hanya aktif saat sedang di-drag. Pembungkus aksi
(`sortable-list.tsx:14`) juga tidak diposisikan, dan tidak ada yang diposisikan
sampai ke `layout.tsx`.

Akibatnya popover mengacu ke *initial containing block* dan muncul terlepas dari
tombol pemicunya — di **semua** lebar viewport, paling parah pada 375px di mana
ia juga keluar dari baris yang terlihat. Pengeditan kategori praktis tidak bisa
dipakai di ponsel.

Perbaikan: tambahkan `relative` permanen pada `<details>` pembungkusnya (bukan
pada baris, agar tidak mengganggu `z-10` saat drag).

### 3.3 MAYOR — grid menambah kolom persis saat sidebar 256px muncul [TERBUKA]

Pada tepat 1024px, kotak konten menyusut menjadi
`1024 − 256 (lg:pl-64) − 64 (lg:p-8) = 704px`, sementara beberapa grid justru
menambah kolom di breakpoint yang sama. **Layout pada 1024px lebih buruk
daripada pada 1000px.**

| File | Kelas | Lebar kolom utama pada 1024px |
| --- | --- | --- |
| `components/admin/menu-manager-client.tsx` | `mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]` | `704 − 24 − 352 = 328px` |
| `components/admin/space-edit-form.tsx:24` | `mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]` | `704 − 32 − 352 = 320px` |
| `components/admin/experience-edit-form.tsx:65` | `mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]` | `704 − 32 − 352 = 320px` |

Kolom utama menjadi **lebih sempit daripada aside gambar 352px di sebelahnya**.
Himpitan ini bertahan dari 1024px sampai 1279px.

`app/admin/(dashboard)/[resource]/page.tsx:156` melakukannya dengan **benar**:
`xl:grid-cols-[minmax(0,1fr)_22rem]`. Tiga file di atas menyalin polanya tetapi
memakai `lg:`. Perbaikan: ganti `lg:` → `xl:` pada ketiganya.

Catatan terpisah: `[resource]/page.tsx` aman pada 1024–1279px, tetapi pada
1165px terukur kolom tunggal 845px dengan input teks selebar **795px** — jauh
melewati panjang baris yang nyaman. Pita 768–1280px memang sengaja bertumpuk,
namun form selebar itu tetap perlu `max-w`.

### 3.4 MAYOR — grid Media Library memakai track yang tidak bisa menyusut [TERBUKA]

`app/admin/(dashboard)/media/page.tsx`

```
<div className="mt-8 grid gap-8 xl:grid-cols-[22rem_1fr]">
```

Track kiri adalah `22rem` polos, bukan `minmax(0,22rem)`, sehingga tidak bisa
menyusut. Digabung dengan grid bersarang `grid gap-4 sm:grid-cols-2
lg:grid-cols-3` pada baris yang sama: pada 1280px kolom kanan sekitar
`928 − 352 = 576px`, tetapi `lg:grid-cols-3` menyala dari lebar **viewport**,
bukan lebar kontainer. Tiga kartu gambar dipaksa masuk ke 576px (≈180px per
kartu setelah `gap-4`), masing-masing memuat thumbnail `aspect-square`, judul,
mime, ukuran, hitungan pemakaian dan dua kontrol.

### 3.5 MAYOR — form tambah pengguna 4 kolom tanpa kelonggaran [TERBUKA]

`app/admin/(dashboard)/users/page.tsx`

```
<form action={addCmsUser} className="mt-10 grid gap-3 … p-6 md:grid-cols-4">
```

Empat kolom sama lebar dari 768px ke atas, tidak pernah dilonggarkan. Pada
1024px tiap sel ≈ `(704 − 48 − 36) / 4 ≈ 155px`, berisi input `User UUID`
(nilai 36 karakter), input email, select peran dan tombol Add. Field UUID tidak
terpakai. Pada 768–1023px ≈161px — masalah yang sama tanpa sidebar.

### 3.6 MAYOR — target sentuh ≈24px sebagai gaya rumah [TERBUKA]

Pola `px-2 py-1 text-xs` menghasilkan teks 12px + kotak baris 16px + padding 8px
= **≈24px tinggi**, sekitar 45% di bawah minimum 44px. Gagal pada setiap
viewport ponsel. Ini dipakai di seluruh manager:

- `components/admin/sortable-list.tsx:14` — tombol ↑ dan ↓, satu-satunya cara
  mengurutkan selain drag. Dipakai oleh Homepage, Gallery, Menu, Spaces,
  Experiences dan `[resource]`.
- `components/admin/homepage-sortable.tsx` — Move up / Move down / Hide-Show,
  dan tombol Edit.
- `components/admin/menu-manager-client.tsx` — Edit / Duplicate / Mark
  unavailable / Delete, serta `<summary>` pemicu popover.
- `components/admin/gallery-manager-client.tsx`
- `components/admin/spaces-manager-client.tsx:62-64`
- `components/admin/experiences-manager-client.tsx:117,123,131`
- `components/admin/event-promotion-manager.tsx`
- `components/admin/sortable-list.tsx:12` — gagang drag
  `cursor-grab touch-none px-2 text-lg` punya **padding vertikal nol**; area
  sentuhnya hanya sebesar kotak glyph.

Karena polanya terpusat, perbaikan paling murah adalah satu kelas bersama
(mis. `min-h-11 px-3 py-2 text-xs` atau `min-h-9` untuk aksi ikon dengan
`sm:min-h-0`) lalu ganti seluruh kemunculan.

### 3.7 MAYOR — baris flex tanpa `flex-wrap` meluap di 375px [TERBUKA]

Tiap baris berisi label checkbox plus `<select>` Status; lebar intrinsik select
memaksa overflow horizontal.

- `components/admin/space-edit-form.tsx:32` — `flex gap-5`
- `components/admin/experience-edit-form.tsx:118` — `flex gap-4`
- `components/admin/experiences-manager-client.tsx:209` — `mt-4 flex gap-4`
- `components/admin/event-promotion-manager.tsx` (form edit) — `flex gap-5`

Pasangan tombol Save + Cancel (`px-6 py-3` masing-masing) berdampingan tanpa
wrap; lebar gabungan melewati 335px ruang tersedia pada 375px:

- `components/admin/event-promotion-manager.tsx` — `flex gap-3`
- `components/admin/space-edit-form.tsx:36` — `flex gap-3`
- `components/admin/experience-edit-form.tsx:141` — `flex gap-3`

Pembanding yang sudah benar: `media/items/[id]/page.tsx:100` memakai
`flex flex-wrap gap-3`.

### 3.8 MINOR [TERBUKA]

- `app/admin/(dashboard)/users/page.tsx` — `<td className="p-4">{user.email}</td>`
  tanpa `truncate`/`break-words`/`max-w`; alamat panjang melebarkan kolom
  melewati `min-w-[720px]` tabel dan memperpanjang jarak scroll horizontal.
- `app/admin/(dashboard)/[resource]/page.tsx:160` — `<summary className="cursor-pointer font-serif text-xl sm:text-2xl">{rowLabel(row)}</summary>`.
  `rowLabel` (baris 18) jatuh ke `String(row.id)` — UUID mentah — bila baris
  tidak punya title/name/site_name/page_key/author_name. Tanpa `truncate`,
  meluap dari kartu `p-5` pada 375px.
- `app/admin/(dashboard)/preview/page.tsx` — `mt-10 grid gap-6 lg:grid-cols-3`
  melompat 1→3 kolom tanpa langkah `sm:`/`md:`; pada 1024px tiap kolom
  ≈`(704 − 48) / 3 ≈ 218px` sambil memuat `font-serif text-2xl sm:text-3xl`.
- `components/admin/event-promotion-manager.tsx` — judul `<p className="font-semibold">{item.label}</p>`
  tanpa `truncate`, meski pembungkusnya punya `min-w-0`.
  `sortable-list.tsx:13` menanganinya dengan benar
  (`<p className="truncate text-sm font-semibold">`).
- `components/admin/media-picker.tsx:93,147` — `sm:grid-cols-[1fr_auto_auto]`
  dan `sm:grid-cols-3` benar pada 375px, tetapi picker ini tertanam di dalam
  kolom form 320–328px dari 3.3, di mana `sm:` sudah aktif karena lebar
  viewport. Tiga kontrol dipaksa ke 320px, dan thumbnail menjadi ≈100px.
  Masalah ini hilang sendiri begitu 3.3 diperbaiki.

---

## 4. Kontras warna di luar bug cascade

Perhitungan WCAG 2.1. Ambang: 4.5:1 teks normal, 3:1 teks besar dan komponen UI.

### 4.1 Variabel CSS palet tidak terpakai sama sekali [TERBUKA]

`app/globals.css` mendefinisikan `--forest: #254632`, `--olive: #3c4734`,
`--terracotta: #b75e42`, `--sand: #ded1b8`. **Tidak satu pun dirujuk** di `app/`
atau `components/`. Setiap permukaan menuliskan hex yang mirip-tapi-beda:
`#1f3426` vs `--forest`, `#b65d40`/`#a04e33` vs `--terracotta`,
`#1e3024`/`#1f2c22` vs `--foreground: #202920`.

Ini yang membuat "ketidaksesuaian warna" terasa acak: tidak ada satu sumber
kebenaran, jadi tiap komponen memilih nada hijaunya sendiri. Keputusan yang
perlu diambil pemilik: hapus variabel mati itu, atau jadikan ia sumber
kebenaran dan ganti hex hardcoded. Rekomendasi: yang kedua, dan `--terracotta`
perlu digelapkan (lihat 4.2).

### 4.2 Di bawah 4.5:1 untuk teks normal [TERBUKA]

| Lokasi | Pasangan | Rasio |
| --- | --- | --- |
| `--terracotta` sebagai latar tombol | `#ffffff` di atas `#b75e42` | **4.47:1** |
| `--terracotta` sebagai teks | `#b75e42` di atas `#f8f3e8` | **4.04:1** |
| `app/admin/(dashboard)/error.tsx:30` | `#768075` di atas `#ede3d0`, `text-xs` | **3.23:1** |
| `components/admin/experiences-manager-client.tsx:117` | `#768075` di atas putih | **4.11:1** |
| `components/admin/spaces-manager-client.tsx:62` | `#768075` di atas putih | **4.11:1** |
| `components/admin/media-picker.tsx:125` | `#9b8563` di atas `#fffaf0` | **3.40:1** |
| `components/admin/spaces-manager-client.tsx:94` | `#657064` di atas `#e8dfca` | **3.91:1** |
| `components/admin/experiences-manager-client.tsx:195` | `#657064` di atas `#e8dfca` | **3.91:1** |
| `components/admin/spaces-manager-client.tsx:77,85` | `#ffffff` di atas `#b65d40` | **4.54:1** (lolos tipis) |

`#768075` gagal di mana pun ia dipakai sebagai teks normal; ia perlu digelapkan
sekitar dua langkah. `--terracotta: #b75e42` tidak bisa dipakai untuk teks putih
maupun sebagai teks di atas krem — perlu digelapkan ke sekitar `#a04e33` yang
sudah dipakai di tempat lain dan mencapai 5.78:1 dengan putih.

### 4.3 Border non-teks di bawah 3:1 [TERBUKA, prioritas rendah]

`#c9bfa8` di atas `#f4eedf` **1.58:1** (pemisah seksi) · `#dde0d7` di atas putih
**1.34:1** (border kartu) · `#e4d6bd` di atas `#fffaf0` **1.38:1** ·
`#baa988` di atas `#d9c9aa` **1.41:1** · `#d6c8ad` di atas putih **1.65:1** ·
`components/admin/media-picker.tsx:76` `#8b9d83` di atas putih **2.90:1** —
yang terakhir adalah tepi terlihat tombol Replace, jadi ia gagal ambang 3:1
untuk komponen UI, bukan sekadar dekorasi.

### 4.4 Pasangan yang sudah lolos (rujukan)

`#ffffff` di atas `#1f3426` 13.31:1 · `#233b2a` 12.14:1 · `#2a4732` 10.26:1 ·
`#405542` 8.09:1 · `#17271d` 15.62:1 · `#a04e33` 5.78:1. `#1e3024` di atas
`#f4eedf` 12.07:1. `#4d5649` di atas krem 6.61:1. `#8a3a21` (eyebrow)
4.76–6.70:1. `#f3c4a6` di atas hijau hutan 8.40:1. Seluruh komposit
`text-white/65…85` mendarat di 4.66–9.34:1.

---

## 5. Focus state dan aksesibilitas keyboard

### 5.1 Outline dihapus tanpa pengganti yang andal [TERBUKA]

- `components/public/header.tsx:23` — tombol nav mobile:
  `focus:outline-none focus:ring-2 focus:ring-[#efb38f]`. Memakai `focus:`
  bukan `focus-visible:`, tanpa `ring-offset`, dan outline native dihapus
  tanpa syarat.
- `components/public/header.tsx:25` — setiap tautan nav utama, pola yang sama.
  Ring `#efb38f` di atas header transparan yang menumpang foto tidak punya
  kontras terjamin.
- `components/public/public-shell.tsx:30` — `<div id={SKIP_TARGET_ID}
  tabIndex={-1} className="pt-0 focus:outline-none">`. Tujuan skip link
  menghapus outline-nya tanpa pengganti, jadi lompatan keyboard tidak memberi
  konfirmasi visual ke mana fokus mendarat.

`components/ui/cta.tsx:15` adalah pola yang benar dan **satu-satunya file di
repo** yang memakai `focus-visible:ring`: `focus:outline-none
focus-visible:ring-2 focus-visible:ring-offset-2` dengan warna ring per varian.
Jadikan itu standar.

### 5.2 Placeholder sebagai satu-satunya label [TERBUKA]

Tidak ada kelas `placeholder:` kustom di mana pun; semua jatuh ke default UA
(≈`#757575`, ≈4.6:1) — dapat diterima. Tetapi tiga placeholder membawa makna
yang hilang begitu field diisi:

- `app/admin/(dashboard)/users/page.tsx` — `placeholder="User UUID"` **tanpa
  `<label>` sama sekali**; placeholder adalah satu-satunya label, hilang saat
  diketik, dan tidak andal untuk pembaca layar.
- `app/admin/(dashboard)/users/page.tsx` — `placeholder="Email (verify
  identity)"`, sama-sama tanpa label.
- `components/admin/menu-manager-client.tsx` — `placeholder="25000"` adalah
  satu-satunya petunjuk format harga (integer rupiah, tanpa pemisah).

---

## 6. UX dan penyampaian informasi

### 6.1 MAYOR [TERBUKA]

- `app/admin/(dashboard)/users/page.tsx` — meminta UUID mentah tanpa petunjuk
  dari mana mengambilnya (dashboard Supabase Auth). Field email di sebelahnya
  berlabel `Email (verify identity)` tetapi **tidak** `required` dan tidak
  pernah dipakai untuk pencarian, sehingga form terbaca seolah mengisi email
  sudah cukup.
- `lib/admin/menu-actions.ts:15` — `"Name, category, slug, and valid price are
  required."` Empat field dalam satu pesan, dan "valid price" menyebut aturan
  tanpa menjelaskan apa yang valid (integer, tanpa pemisah, > 0).
- `lib/admin/actions.ts:61` — `"No order supplied."` / `"This resource has no
  display order."` Bahasa keadaan internal; tidak memberi tindakan bagi
  operator.
- `lib/admin/gallery-actions.ts:7` — `"Invalid Gallery order."` / `"Unknown
  Gallery item."` Sama, dan ditampilkan apa adanya oleh
  `app/admin/(dashboard)/error.tsx:26`.
- `lib/admin/event-actions.ts:13` — `"Event end must be after its start."`
  menyebut aturan tanpa petunjuk perbaikan, dan boundary yang menampilkannya
  **mengganti seluruh halaman**, sehingga operator kehilangan nilai form yang
  sudah diketik. `UnsavedChangesGuard` tidak membantu di jalur ini.
- `app/admin/login/login-form.tsx:33` — `"Sign-in failed. Check credentials."`
  tanpa jalur pemulihan: tidak ada tautan reset password, tidak ada petunjuk
  apakah akun tidak ada atau hanya belum punya peran CMS. `requireAdmin`
  menolak akun Supabase yang valid tanpa baris `user_roles`, dan kasus itu
  tidak bisa dibedakan dari salah password.

### 6.2 Empty state [TERBUKA]

- `app/visit/page.tsx` — `"Hours coming soon."` dan `"Address and directions are
  being prepared."` Ini seluruh alasan halaman itu ada, dan tidak ada ajakan
  alternatif padahal `contact.phone` dan `contact.whatsapp_url` tampil sebagai
  CTA persis di atasnya.
- `app/(public)/page.tsx` — `"{heading} will be curated soon."`,
  `"Menu selections will arrive soon."`, `"More views are on their way."`,
  `"Hours coming soon."` (di seksi Visit, tempat jam buka adalah alasan utama
  orang melihat).
- `app/admin/(dashboard)/media/page.tsx` — `"No images have been uploaded
  yet."` tanpa CTA; `MediaUploadDropzone` ada di kolom grid sebelah, tidak
  tertaut dari pesan.
- `components/admin/experiences-manager-client.tsx:176` — prop `empty="No
  experiences yet."` adalah **kode mati**: baris 161 sudah bercabang pada
  `experiences.length === 0` dan merender empty state-nya sendiri, jadi
  `SortableList` tidak pernah mount dengan daftar kosong. Dua string dirawat
  untuk satu keadaan, dan yang tidak terjangkau justru tanpa CTA.

### 6.3 Penandaan wajib/opsional [TERBUKA]

Form hanya menandai field wajib lewat atribut HTML `required`; tidak ada
penanda visual atau tekstual, jadi operator baru tahu bedanya saat submit.

- `components/admin/event-promotion-manager.tsx` — `Title` dan `Slug` wajib;
  `Summary`, `Body`, `Ends` tidak. Keempat label bergaya identik.
- `components/admin/experiences-manager-client.tsx:189,194,202` — `Experience
  Name`, `Slug`, `Description` semuanya wajib, tidak satu pun ditandai.
- `components/admin/spaces-manager-client.tsx:93-95` — `Space Name` wajib,
  `Slug` dan `Description` tidak; hanya Slug yang membawa petunjuk `"Leave blank
  to generate from name."` Slug Space dibuat otomatis, slug Experience wajib —
  **tidak konsisten antara dua form yang nyaris identik.**
- `app/admin/(dashboard)/[resource]/page.tsx:41` — `FieldInput` menerima
  `field.required` dan hanya memakainya untuk memutuskan apakah select butuh
  prompt kosong (baris 54). Flag itu tidak pernah sampai ke label yang dirender.

### 6.4 Helper text basi [TERBUKA]

- `components/admin/media-picker.tsx:126` — `"Upload an image in the Media
  Library and it appears here straight away."` `MediaPicker` menerima `media`
  sebagai prop yang dirender server; unggahan baru di tab lain **tidak** muncul
  tanpa reload halaman.
- `components/admin/media-upload-dropzone.tsx:93` — `"New uploads default to
  Needs Review."` Sementara `gallery-manager-client.tsx` dan
  `menu-manager-client.tsx` keduanya mengirim `<input type="hidden"
  name="status" value="published"/>`, jadi konten yang merujuk media itu terbit
  terlepas dari status review. Perlu diperiksa terhadap
  `lib/media/upload-core.ts` apakah keadaan "Needs Review" masih menggerbang
  apa pun setelah A67 menghapus gerbang persetujuan.
- `components/admin/media-upload-dropzone.tsx:106` vs
  `lib/media/upload-core.ts:118` — label menyebut
  `MAX_MEDIA_SELECTION_FILES` sedangkan server menegakkan
  `MAX_MEDIA_UPLOAD_FILES`. **Dua konstanta untuk satu batas**; bila keduanya
  berbeda, helper text-nya salah.

---

## 7. Urutan pengerjaan yang disarankan

1. **Sudah selesai** — `app/globals.css` cascade layer (bagian 1). Satu baris,
   dampak seluruh repo, sudah diverifikasi di browser dan dikunci oleh test.
2. `lg:` → `xl:` pada tiga file grid (3.3) — tiga penggantian string, memulihkan
   pita 1024–1279px sekaligus menyelesaikan 3.8 poin media-picker.
3. `relative` pada `<details>` popover kategori menu (3.2) — satu-satunya cacat
   yang rusak di semua lebar.
4. Kelas target sentuh bersama, ganti seluruh `px-2 py-1 text-xs` (3.6) dan
   anchor mentah publik (2.6).
5. `flex-wrap` pada tujuh baris (3.7) dan satu header galeri (2.4).
6. Tinggi/padding hero (2.1, 2.2, 2.5).
7. Konsolidasi palet ke variabel CSS + gelapkan `#768075` dan `--terracotta`
   (4.1, 4.2).
8. `focus-visible` sebagai standar (5.1), label untuk field users (5.2).
9. Pesan error dan empty state (6.1, 6.2), penandaan wajib (6.3), helper text
   basi (6.4).

Butir 2–6 murni presentasi dan tidak menyentuh data; butir 7–9 menyentuh salinan
teks dan palet, yang sebaiknya dikonfirmasi ke pemilik sebelum diubah.
