// A106: berkas ini tadinya `app/spaces/loading.tsx`, satu tingkat di atas sini.
// Di situ ia membungkus **juga** `[slug]`, karena batas Suspense berlaku untuk
// seluruh subtree segmennya. Akibatnya Next mengalirkan skeleton lebih dulu,
// status 200 terkirim bersama byte pertama, dan `notFound()` di halaman detail
// hanya berhasil menukar isi — slug tak dikenal menjawab 200 sambil menampilkan
// halaman 404. Route group `(list)` tidak menambah segmen URL, jadi `/spaces`
// tetap alamat yang sama, tetapi batas Suspense-nya kini berhenti di daftar dan
// tidak lagi menyentuh halaman detail.
//
// `[slug]/loading.tsx` dihapus, bukan dipindahkan: satu-satunya `await` sebelum
// `notFound()` adalah lookup satu baris terindeks, jadi skeleton di sana
// membeli beberapa milidetik dengan harga status HTTP yang salah.
import { PageSkeleton } from "@/components/public/page-skeleton";

export default function Loading() {
  return <PageSkeleton />;
}
