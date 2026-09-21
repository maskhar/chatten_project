import Link from "next/link";
import { loadDraftGroups, loadMediaHealth, loadRecentActivity } from "@/lib/admin/overview";
import { summariseDrafts } from "@/lib/admin/overview-tables";
export const dynamic = "force-dynamic";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function AdminPage() {
  const [groups, activity, media] = await Promise.all([loadDraftGroups(), loadRecentActivity(), loadMediaHealth()]);
  const { pending: pendingGroups, totalDrafts, totalRows } = summariseDrafts(groups);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b5a42]">Dashboard</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Website overview</h1>
          <p className="mt-3 max-w-xl text-[#657064]">Daily control center for Chatten website content, media, and publishing.</p>
        </div>
        <Link href="/admin/homepage" className="rounded bg-[#1f3426] px-4 py-2.5 text-sm font-semibold text-white">Edit homepage</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-[#dde0d7] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#657064]">Content records</p>
          <p className="mt-3 font-serif text-4xl">{totalRows}</p>
          <p className="mt-3 text-xs font-semibold text-[#47714d]">Across {groups.length} sections</p>
        </article>
        <article className={`rounded-lg border p-5 shadow-sm ${totalDrafts ? "border-[#e4d6bd] bg-[#fffaf0]" : "border-[#dde0d7] bg-white"}`}>
          <p className="text-sm text-[#657064]">Unpublished drafts</p>
          <p className="mt-3 font-serif text-4xl">{totalDrafts}</p>
          <p className="mt-3 text-xs font-semibold text-[#47714d]">{totalDrafts ? "Not visible to guests" : "Everything is published"}</p>
        </article>
        <Link href="/admin/media" className="rounded-lg border border-[#dde0d7] bg-white p-5 shadow-sm hover:border-[#a8b6a5]">
          <p className="text-sm text-[#657064]">Media files</p>
          <p className="mt-3 font-serif text-4xl">{media.total}</p>
          <p className="mt-3 text-xs font-semibold text-[#47714d]">Open library</p>
        </Link>
        <Link href="/admin/media?usage=unused" className="rounded-lg border border-[#dde0d7] bg-white p-5 shadow-sm hover:border-[#a8b6a5]">
          <p className="text-sm text-[#657064]">Unused images</p>
          <p className="mt-3 font-serif text-4xl">{media.unused}</p>
          <p className="mt-3 text-xs font-semibold text-[#47714d]">{media.unused ? "Uploaded but not placed on a page yet" : "Every image is in use"}</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-lg border border-[#dde0d7] bg-white p-5">
          <p className="text-sm font-semibold">Needs attention</p>
          {pendingGroups.length ? (
            <ul className="mt-4 grid gap-2">
              {pendingGroups.map((group) => (
                <li key={group.label}>
                  <Link href={group.href} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#e7eae2] px-3 py-2 text-sm hover:border-[#a8b6a5]">
                    <span className="font-semibold">{group.label}</span>
                    <span className="text-[#9b5a42]">{group.drafts} draft{group.drafts === 1 ? "" : "s"} of {group.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[#657064]">No drafts are waiting. Every section is published.</p>
          )}
        </article>

        <article className="rounded-lg border border-[#dde0d7] bg-white p-5">
          <p className="text-sm font-semibold">Recent activity</p>
          {activity.length ? (
            <ul className="mt-4 grid gap-2">
              {activity.map((entry) => (
                <li key={`${entry.group}-${entry.label}-${entry.updatedAt}`}>
                  <Link href={entry.href} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#e7eae2] px-3 py-2 text-sm hover:border-[#a8b6a5]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{entry.label}</span>
                      <span className="block text-xs text-[#657064]">{entry.group} · {entry.status}</span>
                    </span>
                    <time dateTime={entry.updatedAt} className="shrink-0 text-xs text-[#657064]">{relativeTime(entry.updatedAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[#657064]">Nothing has been edited yet.</p>
          )}
        </article>
      </div>

      <article className="mt-4 rounded-lg border border-[#dde0d7] bg-white p-5">
        <p className="text-sm font-semibold">Quick actions</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link className="rounded border border-[#1f3426] px-3 py-1.5 font-semibold" href="/admin/menu">Add menu item</Link>
          <Link className="rounded border border-[#1f3426] px-3 py-1.5 font-semibold" href="/admin/gallery">Update gallery</Link>
          <Link className="rounded border border-[#1f3426] px-3 py-1.5 font-semibold" href="/admin/opening-hours">Set opening hours</Link>
          <Link className="rounded border border-[#1f3426] px-3 py-1.5 font-semibold" href="/admin/media">Upload media</Link>
          <Link className="rounded border border-[#1f3426] px-3 py-1.5 font-semibold" href="/admin/preview">Preview site</Link>
        </div>
      </article>
    </section>
  );
}
