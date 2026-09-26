import Link from "next/link";
import { Suspense } from "react";
import { AdminMobileNav, AdminSidebar, type NavGroup } from "@/components/admin/admin-nav";
import { SavedNotice } from "@/components/admin/saved-notice";
import { SubmitButton } from "@/components/admin/submit-button";
import { ADMIN_MAIN_ID, SKIP_LINK } from "@/components/ui/control";
import { requireAdmin } from "@/lib/auth/require-admin";
import { signOut } from "@/lib/admin/actions";
const groups: readonly NavGroup[] = [["Situs", [["Beranda", "/admin/homepage"], ["Hero", "/admin/hero"], ["Momen Chatten", "/admin/moments"], ["Menu", "/admin/menu"], ["Pengalaman", "/admin/experiences"], ["Ruang", "/admin/spaces"], ["Galeri", "/admin/gallery"], ["Acara", "/admin/events"], ["Promosi", "/admin/promotions"], ["Tentang", "/admin/about"], ["Pratinjau", "/admin/preview"]]], ["Konten", [["Pustaka Media", "/admin/media"], ["Testimoni", "/admin/testimonials"], ["Navigasi", "/admin/navigation"]]], ["Pengaturan", [["Pengaturan Situs", "/admin/site-settings"], ["Jam Buka", "/admin/opening-hours"], ["Kontak & Lokasi", "/admin/contact"], ["Media Sosial", "/admin/social"], ["SEO", "/admin/seo"]]]] as const;
export const dynamic = "force-dynamic";

// A92. Navigasi papan tombol di CMS harus melewati seluruh sidebar sebelum
// mencapai isi halaman. Sidebar memuat dua puluh satu tautan, jadi pada setiap
// perpindahan halaman operator yang memakai papan tombol atau pembaca layar
// menekan Tab dua puluh satu kali untuk sampai ke kolom pertama — dan tidak ada
// jalan pintas karena `<main>` tidak punya target yang dapat dituju.
//
// Tiga hal yang membuatnya bisa dilewati:
//   1. Tautan lewati yang tersembunyi sampai difokuskan. Ia tautan pertama di
//      dalam dokumen, sehingga Tab pertama selalu menawarkannya.
//   2. `<main>` memiliki id tetap dan `tabIndex={-1}`. Tanpa tabIndex, banyak
//      peramban memindahkan gulir tetapi tidak memindahkan fokus, sehingga Tab
//      berikutnya kembali ke tautan sesudah tautan lewati — lompatannya terlihat
//      berhasil padahal tidak.
//   3. Id-nya dinamai sekali di components/ui/control.ts, supaya tautan dan
//      targetnya tidak mungkin berpisah.
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();
  const isAdmin = user.cmsRole === "admin" || user.cmsRole === "super_admin";
  return (
    <div className="min-h-screen bg-paper text-forest">
      <a href={`#${ADMIN_MAIN_ID}`} className={SKIP_LINK}>Lewati ke konten utama</a>
      <AdminSidebar groups={groups} isAdmin={isAdmin} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-mist bg-paper/95 px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <AdminMobileNav groups={groups} isAdmin={isAdmin} />
            <Link href="/admin" className="font-serif text-lg lg:hidden">CHATTEN CMS</Link>
          </div>
          <p className="hidden text-sm text-ink-muted lg:block">Kelola konten situs dengan percaya diri.</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-muted sm:block">{user.email}</span>
            <form action={signOut}>
              <SubmitButton className="inline-flex min-h-11 items-center rounded border border-forest px-3 text-xs font-semibold" pendingLabel="Keluar…">Keluar</SubmitButton>
            </form>
          </div>
        </header>
        <main id={ADMIN_MAIN_ID} tabIndex={-1} className="mx-auto max-w-[1500px] p-5 outline-none lg:p-8">
          <Suspense fallback={null}><SavedNotice /></Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
