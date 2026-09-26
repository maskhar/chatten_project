# Panduan CMS

## Aksi Baris dan Urutan Tampilan

Aturan ini berlaku sama pada pengelola Homepage, Pengalaman, Ruang, Menu, dan Galeri.

- Satu aksi baris berjalan pada satu waktu. Selama satu baris diproses, tombol
  **Tampilkan**/**Sembunyikan**, **Duplikat**, **Hapus**, dan **Edit** pada semua
  baris terkunci sampai aksi itu selesai.
- Baris yang sedang diproses memakai label sementara, yaitu **Menyimpan…** untuk
  perubahan status dan **Menghapus…** untuk penghapusan.
- Hasil aksi tampil tepat di baris yang dioperasikan. Keberhasilan ditulis dengan
  kalimatnya sendiri, misalnya `Ruang disembunyikan.`, dan kegagalan ditulis
  sebagai peringatan, misalnya `Ruang gagal dihapus.` Warna bukan satu-satunya
  penanda; keduanya selalu berupa kalimat.
- Selama aksi baris berjalan, pengurutan ikut terkunci: seret, tombol panah, dan
  **Simpan urutan tampilan** tidak aktif. Sebaliknya, saat urutan sedang
  disimpan, semua aksi baris terkunci.
- Bila urutan di layar sama dengan urutan yang sudah tersimpan, tombol simpan
  tidak mengirim apa pun dan menjawab
  `Urutan belum berubah, jadi tidak ada yang perlu disimpan.`
- Bila penyimpanan urutan gagal, daftar dikembalikan ke urutan tersimpan terakhir
  dan pesan menutup dengan `Urutan tersimpan telah dipulihkan.` Penyimpanan yang
  berhasil menjawab `Urutan berhasil disimpan.`
- Perubahan data dari tab lain atau dari aksi lain tidak membatalkan urutan yang
  sedang diatur namun belum disimpan, selama daftar barisnya tetap sama. Bila ada
  baris yang ditambah atau dihapus, daftar mengikuti versi server; atur ulang
  urutan lalu simpan kembali.

## Homepage

- Seret kartu bagian, lalu pilih **Simpan urutan tampilan**.
- Gunakan tombol panah naik dan turun untuk mengurutkan dengan keyboard.
- Gunakan **Tampilkan** atau **Sembunyikan** untuk mengatur visibilitas di homepage publik.
- Gunakan **Edit** untuk membuka editor setiap bagian. Homepage publik mengikuti urutan dan visibilitas yang sudah disimpan.

## Pengalaman

- Lihat semua pengalaman dalam daftar kartu visual yang menampilkan thumbnail, judul, slug, deskripsi, dan status.
- Gunakan **Tambah Pengalaman** untuk membuat pengalaman baru dengan nama, slug, deskripsi, dan gambar dari Media Picker.
- Pilih **Edit** pada kartu pengalaman untuk mengubah detailnya.
- Nama pengalaman menjadi judul publik pada `/experience` dan `/experience/[slug]`.
- Slug harus ramah URL (misalnya `morning-coffee`). Nilai ini menjadi jalur URL publik.
- Deskripsi tampil pada halaman daftar dan detail pengalaman.
- Pilih gambar melalui Media Picker.
- Kotak centang **Aktif** mengatur apakah pengalaman terlihat; nilainya digunakan bersama status penerbitan.
- Status dapat berupa **Draf** atau **Terbit**. Hanya pengalaman yang Terbit dan Aktif yang tampil di situs publik.
- **Simpan perubahan** memperbarui pengalaman. **Batal** kembali ke daftar pengalaman tanpa menyimpan.

### Urutan Pengalaman

- Seret kartu pengalaman untuk mengubah urutan, lalu pilih **Simpan urutan tampilan** untuk menyimpan perubahan.
- Gunakan tombol panah naik dan turun untuk pengurutan yang dapat diakses dengan keyboard.
- Pengalaman pertama tidak dapat dipindahkan ke atas; pengalaman terakhir tidak dapat dipindahkan ke bawah.
- Halaman publik `/experience` menampilkan pengalaman sesuai urutan tersimpan.

### Visibilitas Pengalaman

- Gunakan **Tampilkan** atau **Sembunyikan** untuk mengubah visibilitas pengalaman tanpa membuka editor.
- Pengalaman harus berstatus **Aktif** dan **Terbit** agar tampil di situs publik.
- Pengalaman **Draf** tetap tersembunyi, terlepas dari status Aktif.
- Lencana status menunjukkan keadaan saat ini: Draf (abu-abu) atau Terbit (hijau), serta Aktif (biru) atau Nonaktif (abu-abu).

### Menghapus Pengalaman

- Pilih **Hapus** pada kartu pengalaman untuk menghapusnya secara permanen.
- Dialog konfirmasi menjelaskan bahwa penghapusan bersifat permanen, tetapi berkas media terkait tetap disimpan.
- Menghapus pengalaman tidak menghapus gambarnya dari Pustaka Media.
- Gambar yang sama dapat dipakai kembali oleh konten lain setelah pengalaman dihapus.

## Ruang

- Gunakan pengelola **Ruang** di `/admin/spaces` untuk melihat Ruang sebagai kartu visual.
- Pilih **Tambah Ruang** untuk membuat Ruang, atau **Edit** pada kartu yang ada untuk membuka formulir khususnya.
- Bidang yang dapat diubah adalah Nama ruang, Slug, Deskripsi, gambar dari Media Picker, Aktif, dan Status.
- Kosongkan Slug saat membuat Ruang agar nilainya dibuat dari nama Ruang; ubah slug sebagai pengenal huruf kecil yang ramah URL.
- Media Picker menampilkan gambar dari Pustaka Media. Gambar yang sudah ada langsung ditandai sebagai pilihan; gambar opsional dapat diganti atau dihapus dari pilihan tanpa menghapus aset Pustaka Media.
- Gunakan **Simpan perubahan** untuk menyimpan Ruang dan **Batal** untuk kembali ke pengelola.

### Urutan Ruang

- Seret kartu Ruang, lalu pilih **Simpan urutan tampilan** untuk menyimpan urutan publiknya.
- Gunakan tombol panah naik dan turun untuk pengurutan dengan keyboard maupun perangkat seluler. Kontrol batas dinonaktifkan pada Ruang pertama dan terakhir.
- Pengurutan bersifat visual; operator tidak perlu memasukkan angka `sort_order` mentah.

### Visibilitas Ruang

- Gunakan **Tampilkan** atau **Sembunyikan** untuk mengubah status Aktif dengan cepat.
- **Draf** dan **Terbit** adalah status editorial terpisah. Rute publik memerlukan status Aktif dan Terbit.

### Menghapus Ruang

- **Hapus** menghapus data Ruang yang dipilih setelah konfirmasi.
- Media terkait tetap tersedia di Pustaka Media dan tidak ada objek Storage yang dihapus.
- Ruang tersisa mempertahankan urutan publik yang ternormalisasi setelah penghapusan.

## Acara dan Promosi

- Gunakan `/admin/events` dan `/admin/promotions` untuk pengelola khusus yang ramah operator.
- Tambahkan atau ubah judul, slug, ringkasan, isi, gambar dari Media Picker, tanggal, status Aktif, dan status editorial.
- Tanggal/waktu Mulai Acara wajib diisi; tanggal/waktu Selesai Acara opsional dan tidak boleh lebih awal daripada Mulai.
- Tanggal/waktu Mulai dan Selesai Promosi bersifat opsional; bila keduanya diisi, Selesai tidak boleh lebih awal daripada Mulai.
- Media Picker menampilkan gambar dari Pustaka Media. Mengganti atau menghapus pilihan gambar hanya mengubah relasi konten dan mempertahankan aset Pustaka Media.
- Acara diurutkan berdasarkan waktu Mulai secara kronologis. Promosi mengikuti urutan pembuatan awal di homepage. **Tampilkan**/**Sembunyikan** mengubah status Aktif tanpa mengubah status Draf/Terbit.
- **Hapus** hanya menghapus data Acara atau Promosi; aset Pustaka Media dan Storage terkait tetap disimpan.

## Menu

- Tambahkan, ubah, hapus, seret, atau pindahkan kategori menu. Kategori yang berisi item tidak dapat dihapus.
- Tambahkan item dengan kategori, harga Rupiah, ketersediaan, deskripsi, dan gambar dari Media Picker.
- Ubah, duplikat, hapus, seret, atau pindahkan item di dalam kategorinya.
- Saat menyimpan urutan, daftar harus tetap memuat semua kategori atau semua item dalam kategori tersebut tepat satu kali. Bila data berubah di tab lain, muat ulang halaman lalu ulangi pengurutan; sistem menolak daftar parsial agar rank publik tidak bertabrakan.
- Perubahan ketersediaan langsung dipublikasikan. Media yang dipakai kembali tetap berada di Pustaka Media.
- Masukkan harga sebagai angka Rupiah biasa, misalnya `25000`; daftar menampilkan `Rp 25.000`.

## Galeri

- Tambahkan gambar dari Pustaka Media, ubah keterangan dan teks alt, ganti referensi gambar, tampilkan atau sembunyikan item, serta hapus data Galeri.
- Seret item atau gunakan tombol panah naik/turun untuk menyimpan urutan publik.
- Simpanan urutan harus memuat setiap item Galeri tepat satu kali. Bila ada item yang ditambah atau dihapus di tempat lain, muat ulang halaman lalu simpan urutan kembali.
- Menghapus item Galeri tidak menghapus aset Pustaka Media yang digunakan bersama.

## Memilih Gambar

Saat memilih gambar untuk konten (Hero, Moments, Menu, Galeri, Pengalaman, Acara, atau Promosi), Media Picker menampilkan gambar dari Pustaka Media.

### Pencarian dan Filter

- **Cari gambar...** mencocokkan judul gambar, teks alt, dan kategori tanpa membedakan huruf besar/kecil.
- **Filter kategori** menampilkan semua kategori unik dari gambar yang tersedia, diurutkan menurut abjad.
- Pencarian dan kategori menggunakan logika AND; kedua kondisi harus cocok.
- Gunakan **Bersihkan filter** untuk mengatur ulang pencarian dan kategori sekaligus.

### Memilih Gambar

- Gambar yang saat ini dipilih menampilkan label **Terpilih** di atas judul agar jelas.
- Thumbnail terpilih menampilkan cincin batas hijau dan keadaan pilihan di grid.
- Pilih thumbnail gambar mana pun untuk memilihnya.
- Gunakan **Ganti** untuk mengosongkan pilihan saat ini sebelum memilih gambar lain.
- Gunakan **Hapus pilihan** untuk mengosongkan pilihan; tombol ini hanya tersedia bila bidang bersifat opsional.

### Keadaan Kosong

- Bila belum ada gambar, picker menampilkan **Belum ada gambar** dengan panduan untuk mengunggah gambar terlebih dahulu.
- Tombol **Buka Pustaka Media** membuka `/admin/media` untuk mengunggah gambar.
- Bila filter tidak menghasilkan gambar, picker menampilkan **Tidak ada gambar yang sesuai dengan filter.** dengan tindakan **Bersihkan filter**.

### Alur Kerja

1. Unggah gambar melalui Pustaka Media.
2. Kembali ke editor konten (Hero, Menu, Galeri, Pengalaman, dan sebagainya).
3. Pilih gambar melalui Media Picker.

## Pencarian Media

- Ketik kata pada **Cari media…**, kirim pencarian dengan **Cari**, lalu gunakan **Hapus filter** untuk kembali ke pustaka lengkap.
- Filter **Penggunaan** menyediakan **Semua penggunaan**, **Digunakan**, atau **Belum digunakan** dan digabungkan dengan pencarian.
- Filter **Kategori** menggunakan kategori Media yang ada dan digabungkan dengan pencarian serta Penggunaan.
- **Hapus filter** mengatur ulang Cari, Penggunaan, dan Kategori sekaligus.

## Mengunggah Banyak Gambar

- Pilih beberapa gambar dalam satu interaksi pemilih berkas, atau seret dan lepas gambar ke area unggah.
- Setiap unggahan menerima paling banyak 20 berkas. Pilihan yang melampaui batas tetap terlihat agar berkas dapat dihapus sebelum dikirim.
- Format yang didukung adalah JPEG, PNG, WebP, dan AVIF, dengan ukuran maksimum 10 MB per gambar.
- Gambar yang berhasil diunggah langsung masuk ke Pustaka Media dan dapat digunakan.

## Hasil Unggahan

- Setiap berkas yang dipilih menampilkan statusnya sendiri: **Siap**, **Mengunggah**, **Berhasil**, atau **Gagal**.
- Berkas yang gagal menampilkan alasan spesifik, seperti format tidak didukung, batas ukuran berkas, atau duplikasi terdeteksi.
- Satu berkas yang gagal tidak membatalkan unggahan berkas lain yang berhasil dalam kumpulan yang sama.
- Ringkasan muncul hanya setelah seluruh berkas dalam antrean punya hasil, bukan setelah berkas pertama selesai, sehingga angkanya tidak pernah menghitung kumpulan yang masih berjalan.
- Antrean hanya terkunci selama unggahan berjalan. Setelah semuanya selesai, antrean tetap dapat diubah: tambahkan berkas baru, gunakan **Kosongkan antrean**, atau hapus satu baris dengan **Hapus dari antrean**.
- Bila ada yang gagal, tombol **Ulangi N berkas gagal** menyisakan hanya baris yang gagal dan mengembalikannya ke status **Siap**. Berkas yang sudah berhasil dibuang dari antrean dan tidak pernah dikirim ulang, karena berkasnya sudah ada di Pustaka Media dan pengiriman kedua hanya akan ditolak sebagai duplikat.
- Setelah mengulang, tombol kirim menyebutkan jumlah yang tersisa, misalnya **Unggah 3 berkas tersisa**.

## Digunakan di

- Buka item Media melalui **Lihat / Edit** di Pustaka Media.
- **Digunakan di** menampilkan setiap sumber daya CMS yang saat ini merujuk gambar tersebut, beserta nama sumber daya dan konten yang mudah dibaca.
- Gambar tanpa referensi menampilkan `Gambar ini belum dipakai di mana pun.`

## Menghapus Media

- Gambar yang tidak digunakan dapat dihapus dari Pustaka Media setelah mengonfirmasi penghapusan permanen dari Storage.
- Gambar yang digunakan tidak dapat dihapus. Kartu Media menampilkan jumlah penggunaan saat ini serta nama sumber daya dan konten yang mudah dibaca.
- Hapus atau ganti setiap referensi konten yang terdaftar sebelum menghapus gambar.
- Server memeriksa kembali penggunaan saat ini saat **Hapus dengan aman** dikirim, sehingga keadaan halaman yang sudah usang tidak dapat melewati perlindungan.
- Hapus media punya tiga hasil akhir yang berbeda:
  - **Berhasil.** Kartu menampilkan `Gambar dihapus dari Pustaka Media dan Storage.` dan tombolnya hilang, karena barisnya memang sudah tidak ada.
  - **Ditolak atau tidak ada yang berubah.** Alasannya ditulis dan tombol **Hapus dengan aman** tetap tersedia untuk dicoba lagi. Pesan kegagalan lama disembunyikan selama percobaan berikutnya berjalan.
  - **Berkas yatim.** Catatan gambar sudah terhapus tetapi berkasnya masih tertinggal di Storage. Pesannya menyebutkan jalur berkas yang tertinggal, tombolnya hilang, dan pembersihannya perlu administrator — mencoba menghapus ulang tidak ada gunanya karena barisnya sudah hilang. Salin jalur tersebut saat melapor, lalu muat ulang halaman.

## Pengguna dan Peran

- Peran CMS terdiri dari **Editor** (konten), **Admin** (konten, pengaturan, dan keanggotaan), serta **Super admin** (semuanya).
- **Admin tidak dapat memberikan, mengubah, atau menghapus peran Super admin.** Hanya Super admin yang dapat melakukannya.
- Bagi Admin, pilihan **Super admin** tampil terkunci, baris anggota Super admin terkunci seluruhnya, dan formulir penambahan pengguna dinonaktifkan dengan keterangan `Hanya Super admin yang dapat menambah pengguna CMS.`
- Tidak ada peran yang dapat menghapus perannya sendiri, dan Super admin tidak dapat menurunkan perannya sendiri.
- Aturan ini ditegakkan oleh basis data, bukan hanya oleh antarmuka, sehingga tetap berlaku pada setiap jalur akses.
- Super admin terakhir tidak dapat dihapus. Angkat Super admin kedua terlebih dahulu bila peran itu perlu dipindahkan.
