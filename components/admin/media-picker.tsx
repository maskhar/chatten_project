"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaHrefById } from "@/lib/media/url";
import { filterPickerMedia, pickerCategories } from "@/lib/media/picker-filter";
import { FOCUS_RING } from "@/components/ui/control";

type Media = {
  id: string;
  title: string | null;
  alt_text: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  bucket: string;
  storage_path: string;
};

const MISSING_MESSAGE = "Pilih satu gambar sebelum menyimpan.";

// Bagian filter dan tombol per kartu sebelumnya `px-3 py-1.5`/`px-3 py-2`
// (±34–38px). Ini kontrol yang paling sering disentuh saat menyusun konten dari
// ponsel, jadi tingginya dinaikkan ke 44px seperti kontrol CMS lainnya.
const PICKER_FIELD = `min-w-0 w-full min-h-11 rounded border border-line bg-white px-3 text-sm ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-paper`;
const PICKER_BUTTON = `inline-flex min-h-11 items-center justify-center rounded border border-line bg-white px-3 text-sm text-ink hover:bg-paper ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-paper`;

// A92. `required` di komponen ini tidak pernah memvalidasi apa pun. Ia hanya
// menyembunyikan tombol "Hapus pilihan", sedangkan nilainya dikirim melalui
// `<input type="hidden">` — dan input bertipe hidden dikecualikan dari validasi
// bawaan peramban. Formulir dengan gambar wajib karena itu tetap terkirim dengan
// nilai kosong, dan kegagalannya baru muncul sebagai galat dari server (atau,
// lebih buruk, sebagai baris tanpa gambar di situs publik).
//
// Dua hal yang diperbaiki di sini, keduanya soal nilai yang tidak dapat dipercaya:
//
//   1. Wajib berarti wajib. Ada satu input sentinel yang benar-benar divalidasi
//      peramban: `required` tanpa `readOnly`, karena `readOnly` juga membuat
//      sebuah kontrol dikecualikan dari validasi. Pengiriman jadi terhalang di
//      peramban, sebelum Server Action dipanggil. Gelembung bawaan ditekan lewat
//      `preventDefault()` pada `onInvalid` — ia akan muncul di posisi aneh untuk
//      kontrol yang tersembunyi secara visual — dan digantikan pesan `role="alert"`
//      berbahasa Indonesia, sementara fokus dipindahkan ke pemilih itu sendiri.
//
//   2. Id terpilih yang basi tidak boleh ikut terkirim. `media.find(...)` hanya
//      mengembalikan `undefined` bila `value` menyebut gambar yang sudah tidak ada
//      di Pustaka Media — mis. gambar itu dihapus setelah baris ini dibuat. Kartu
//      "Terpilih" lalu tidak dirender, sehingga layar terlihat seperti belum
//      memilih apa pun, tetapi input tersembunyi tetap mengirim id lama tersebut
//      dan baris disimpan menunjuk ke gambar yang tidak ada.
//
//      Sekarang yang dikirim adalah `effective`: id hanya lolos bila benar-benar
//      ada di `media`. Kondisi basi itu juga dikatakan, bukan didiamkan — operator
//      perlu tahu gambar sebelumnya sudah hilang, sebab menyimpan tanpa memilih
//      ulang berarti mengosongkan gambar pada baris itu.
export function MediaPicker({
  name,
  value,
  media,
  required = false,
}: {
  name: string;
  value?: string;
  media: Media[];
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState(value ?? "");
  const [missing, setMissing] = useState(false);
  const sentinelRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => pickerCategories(media), [media]);

  const filtered = useMemo(
    () => filterPickerMedia(media, query, categoryFilter),
    [media, query, categoryFilter],
  );

  const knownIds = useMemo(() => new Set(media.map((item) => item.id)), [media]);
  const isStale = selected !== "" && !knownIds.has(selected);
  const effective = isStale ? "" : selected;
  const current = media.find((item) => item.id === effective);

  useEffect(() => {
    // Pesan bawaan peramban berbahasa Inggris dan tidak menyebut gambar. Ini
    // dipasang sebagai jaring kedua saja; jalur normalnya adalah pesan
    // `role="alert"` di bawah.
    sentinelRef.current?.setCustomValidity(required && !effective ? MISSING_MESSAGE : "");
  }, [effective, required]);

  // Galat berhenti begitu penyebabnya hilang. Peringatan yang bertahan setelah
  // operator memilih gambar akan terbaca seperti penolakan yang baru — dan ini
  // diturunkan, bukan disetel dari dalam efek: `setMissing(false)` di dalam
  // useEffect memicu render berantai (react-hooks/set-state-in-effect), dan ada
  // satu render di mana peringatan masih tampak padahal gambar sudah dipilih.
  const showMissing = missing && !effective;

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
  };

  const hasActiveFilters = query || categoryFilter;

  return (
    <div
      ref={groupRef}
      tabIndex={-1}
      className="@container mt-2 grid min-w-0 w-full gap-3 rounded border border-line bg-paper p-4 outline-none"
    >
      {/* Sentinel: satu-satunya kontrol di sini yang divalidasi peramban.
          `tabIndex={-1}` menjaganya di luar urutan Tab, dan fokus selalu
          dialihkan ke pemilih, bukan ke sentinel. */}
      <input
        ref={sentinelRef}
        type="text"
        name={name}
        value={effective}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onInvalid={(event) => {
          event.preventDefault();
          setMissing(true);
          groupRef.current?.focus();
        }}
      />
      {showMissing ? (
        <p role="alert" className="rounded border border-terracotta bg-blush p-3 text-sm text-rust">
          {MISSING_MESSAGE}
        </p>
      ) : null}
      {isStale ? (
        <p role="alert" className="rounded border border-honey bg-honey-pale p-3 text-sm text-honey">
          Gambar yang dipilih sebelumnya sudah tidak ada di Pustaka Media. Pilih gambar lain
          {required ? " sebelum menyimpan." : ", atau simpan tanpa gambar."}
        </p>
      ) : null}
      {current ? (
        <div className="flex min-w-0 flex-wrap items-center gap-3 rounded border border-sage-deep bg-white p-3 shadow-sm">
          <Image
            src={mediaHrefById(current.id)!}
            alt={current.alt_text ?? current.title ?? ""}
            width={96}
            height={72}
            className="h-16 w-20 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-leaf-ink">
              Terpilih
            </p>
            <p className="mt-1 truncate font-medium">
              {current.title ?? "Gambar tanpa judul"}
            </p>
            <p className="truncate text-xs text-ink">
              {current.alt_text ?? "Tanpa teks alternatif"}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 @sm:w-auto @sm:shrink-0">
            <button
              type="button"
              className={`${PICKER_BUTTON} border-sage-deep font-medium text-forest`}
              onClick={() => setSelected("")}
            >
              Ganti
            </button>
            {!required && (
              <button
                type="button"
                className={PICKER_BUTTON}
                onClick={() => setSelected("")}
              >
                Hapus pilihan
              </button>
            )}
          </div>
        </div>
      ) : null}
      <div className="grid min-w-0 w-full gap-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari gambar..."
          aria-label="Cari gambar"
          className={PICKER_FIELD}
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter kategori"
          className={PICKER_FIELD}
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className={PICKER_BUTTON}>
            Bersihkan filter
          </button>
        )}
      </div>
      {media.length === 0 ? (
        <div className="rounded border border-sand-deep bg-cream p-6 text-center">
          <p className="font-medium text-bark">Belum ada gambar</p>
          <p className="mt-2 text-sm text-bark">
            Unggah gambar di Pustaka Media dan gambar akan langsung tampil di sini.
          </p>
          <Link
            href="/admin/media"
            className={`mt-4 inline-flex min-h-11 items-center rounded bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-soft ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-cream`}
          >
            Buka Pustaka Media
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-line bg-white p-6 text-center">
          <p className="text-sm text-ink">Tidak ada gambar yang sesuai dengan filter.</p>
          <button
            type="button"
            onClick={clearFilters}
            className={`${PICKER_BUTTON} mt-3 font-medium`}
          >
            Bersihkan filter
          </button>
        </div>
      ) : (
        <div className="grid min-w-0 w-full max-h-80 grid-cols-1 gap-2 overflow-y-auto rounded border border-mist bg-white p-2 @xs:grid-cols-2 @lg:grid-cols-3">
          {filtered.map((item) => {
            const url = mediaHrefById(item.id)!;
            const isSelected = effective === item.id;
            return (
              <button
                type="button"
                onClick={() => setSelected(item.id)}
                className={`min-w-0 w-full overflow-hidden rounded border text-left transition-all ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-white ${isSelected ? "border-leaf-ink ring-2 ring-leaf-ink ring-offset-1" : "border-mist hover:border-sage-deep"}`}
                key={item.id}
                aria-label={`Pilih ${item.title ?? item.alt_text ?? "gambar"}`}
                aria-pressed={isSelected}
              >
                <Image
                  src={url}
                  alt={item.alt_text ?? item.title ?? ""}
                  width={180}
                  height={120}
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-2">
                  {isSelected && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-leaf-ink">
                      Terpilih
                    </p>
                  )}
                  <span className="block truncate text-xs">
                    {item.title ?? item.alt_text ?? "Tanpa judul"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
