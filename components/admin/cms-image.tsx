/**
 * Satu-satunya jalur gambar untuk layar CMS. Sengaja `<img>` biasa, bukan
 * `next/image`, dan itu keputusan keamanan — bukan penyederhanaan.
 *
 * Pengoptimal gambar Next mengambil `src` dari SISI SERVER: proses Next yang
 * meminta URL-nya, bukan peramban, sehingga cookie sesi operator tidak pernah
 * ikut terkirim. Sejak A93 mempersempit `public_media` ke media yang benar-benar
 * dirujuk konten, `/api/media/<id>` yang diminta tanpa sesi berjalan sebagai
 * `anon`, tidak menemukan baris, dan menjawab 404 — lalu pengoptimal menjawab
 * 400 ke peramban ("The requested resource isn't a valid image … received
 * null"). Akibatnya Pustaka Media dan setiap pemilih gambar kehilangan seluruh
 * thumbnail-nya, dan operator harus memilih gambar tanpa melihatnya.
 *
 * Konsekuensinya umum, bukan khas satu layar: pengoptimal tidak membawa
 * identitas pemanggil, jadi ia tidak akan pernah bisa melayani gambar yang
 * butuh otorisasi. Apa pun yang berhasil ia ambil justru yang `anon` juga boleh
 * ambil. Karena itu menambal `src` tidak menyelesaikan apa pun — yang harus
 * berubah adalah SIAPA yang mengambil. Dengan `<img>`, peramban operator yang
 * mengambil, cookie sesinya terkirim, dan route yang memang sudah benar
 * menjawab 200. Tidak ada jalur baca baru, tidak ada perubahan basis data, dan
 * batas A93 tetap utuh.
 *
 * Sisi publik TETAP memakai `next/image` lewat components/public/media-image.tsx
 * dan tidak boleh mengikuti berkas ini: media yang dirujuk konten memang boleh
 * dibaca `anon`, jadi ambilan pengoptimal berhasil di sana — dan justru di sanalah
 * resize dibutuhkan, karena yang mengunduh adalah pengunjung dengan kuota data.
 *
 * Harga yang dibayar, dengan sadar: thumbnail CMS memuat berkas aslinya tanpa
 * resize. Yang menanggung hanya operator di jaringan yang ia kenal, bukan
 * pengunjung; `loading="lazy"` menahan yang di luar viewport. Bila suatu hari
 * pustaka tumbuh sampai ini terasa, jawabannya adalah turunan ukuran kecil yang
 * dibuat saat unggah dan disimpan sebagai objek tersendiri — bukan menghidupkan
 * kembali pengoptimal di jalur yang tidak membawa sesi.
 */

export function CmsImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = "",
  style,
}: {
  src: string;
  /** `""` untuk gambar dekoratif; teks alternatif tidak boleh mengulang nama berkas. */
  alt: string;
  width?: number;
  height?: number;
  /** Merentang memenuhi induk berposisi, padanan `fill` milik next/image. */
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  // `fill` pada next/image memasang inset absolut lewat gaya bawaannya. Di
  // `<img>` itu harus ditulis sendiri, kalau tidak gambarnya jatuh ke aliran
  // normal dan induk `aspect-[4/3]`-nya kolaps.
  const fillStyle: React.CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- lihat catatan di atas: pengoptimal tidak membawa cookie sesi, jadi next/image menggelapkan setiap thumbnail CMS.
    <img
      src={src}
      alt={alt}
      {...(fill ? {} : { width, height })}
      loading="lazy"
      decoding="async"
      className={className}
      style={fillStyle ? { ...fillStyle, ...style } : style}
    />
  );
}
