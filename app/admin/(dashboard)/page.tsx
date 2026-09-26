import Link from "next/link";
import { loadDraftGroups, loadMediaHealth, loadRecentActivity } from "@/lib/admin/overview";
import { summariseDrafts } from "@/lib/admin/overview-tables";
export const dynamic = "force-dynamic";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hr lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default async function AdminPage() {
  const [groups, activity, media] = await Promise.all([loadDraftGroups(), loadRecentActivity(), loadMediaHealth()]);
  const { pending: pendingGroups, totalDrafts, totalRows } = summariseDrafts(groups);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-clay">Dasbor</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Ringkasan situs</h1>
          <p className="mt-3 max-w-xl text-ink-muted">Pusat kendali harian untuk konten, media, dan publikasi situs Chatten.</p>
        </div>
        <Link href="/admin/homepage" className="rounded bg-forest px-4 py-2.5 text-sm font-semibold text-white">Ubah beranda</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-mist bg-white p-5 shadow-sm">
          <p className="text-sm text-ink-muted">Catatan konten</p>
          <p className="mt-3 font-serif text-4xl">{totalRows}</p>
          <p className="mt-3 text-xs font-semibold text-leaf-ink">Tersebar di {groups.length} bagian</p>
        </article>
        <article className={`rounded-lg border p-5 shadow-sm ${totalDrafts ? "border-sand-deep bg-cream" : "border-mist bg-white"}`}>
          <p className="text-sm text-ink-muted">Draf belum terbit</p>
          <p className="mt-3 font-serif text-4xl">{totalDrafts}</p>
          <p className="mt-3 text-xs font-semibold text-leaf-ink">{totalDrafts ? "Belum terlihat oleh tamu" : "Semua sudah terbit"}</p>
        </article>
        <Link href="/admin/media" className="rounded-lg border border-mist bg-white p-5 shadow-sm hover:border-sage">
          <p className="text-sm text-ink-muted">Berkas media</p>
          <p className="mt-3 font-serif text-4xl">{media.total}</p>
          <p className="mt-3 text-xs font-semibold text-leaf-ink">Buka pustaka</p>
        </Link>
        <Link href="/admin/media?usage=unused" className="rounded-lg border border-mist bg-white p-5 shadow-sm hover:border-sage">
          <p className="text-sm text-ink-muted">Gambar belum dipakai</p>
          <p className="mt-3 font-serif text-4xl">{media.unused}</p>
          <p className="mt-3 text-xs font-semibold text-leaf-ink">{media.unused ? "Sudah diunggah tapi belum dipasang di halaman" : "Semua gambar sudah dipakai"}</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-lg border border-mist bg-white p-5">
          <p className="text-sm font-semibold">Perlu perhatian</p>
          {pendingGroups.length ? (
            <ul className="mt-4 grid gap-2">
              {pendingGroups.map((group) => (
                <li key={group.label}>
                  <Link href={group.href} className="flex flex-wrap items-center justify-between gap-2 rounded border border-mist px-3 py-2 text-sm hover:border-sage">
                    <span className="font-semibold">{group.label}</span>
                    <span className="text-clay">{group.drafts} draf dari {group.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Tidak ada draf yang menunggu. Semua bagian sudah terbit.</p>
          )}
        </article>

        <article className="rounded-lg border border-mist bg-white p-5">
          <p className="text-sm font-semibold">Aktivitas terbaru</p>
          {activity.length ? (
            <ul className="mt-4 grid gap-2">
              {activity.map((entry) => (
                <li key={`${entry.group}-${entry.label}-${entry.updatedAt}`}>
                  <Link href={entry.href} className="flex flex-wrap items-center justify-between gap-2 rounded border border-mist px-3 py-2 text-sm hover:border-sage">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{entry.label}</span>
                      <span className="block text-xs text-ink-muted">{entry.group} · {entry.status}</span>
                    </span>
                    <time dateTime={entry.updatedAt} className="shrink-0 text-xs text-ink-muted">{relativeTime(entry.updatedAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Belum ada yang diubah.</p>
          )}
        </article>
      </div>

      <article className="mt-4 rounded-lg border border-mist bg-white p-5">
        <p className="text-sm font-semibold">Aksi cepat</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link className="rounded border border-forest px-3 py-1.5 font-semibold" href="/admin/menu">Tambah item menu</Link>
          <Link className="rounded border border-forest px-3 py-1.5 font-semibold" href="/admin/gallery">Perbarui galeri</Link>
          <Link className="rounded border border-forest px-3 py-1.5 font-semibold" href="/admin/opening-hours">Atur jam buka</Link>
          <Link className="rounded border border-forest px-3 py-1.5 font-semibold" href="/admin/media">Unggah media</Link>
          <Link className="rounded border border-forest px-3 py-1.5 font-semibold" href="/admin/preview">Pratinjau situs</Link>
        </div>
      </article>
    </section>
  );
}
