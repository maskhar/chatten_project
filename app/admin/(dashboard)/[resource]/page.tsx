import { saveResource, deleteResource, reorderResource } from "@/lib/admin/actions";
import { minRoleFor, resourceFor, retiredResourceRedirects, type Field } from "@/lib/admin/resources";
import { buildSearchFilter, listHref, pageRange, paginationState, parseListQuery, resourceHasStatus } from "@/lib/admin/list-query";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { SubmitButton } from "@/components/admin/submit-button";
import { MediaPicker } from "@/components/admin/media-picker";
import { ResourceReorder } from "@/components/admin/resource-reorder";
import { UnsavedChangesGuard } from "@/components/admin/unsaved-changes-guard";

type MediaOption = { id: string; title: string | null; alt_text: string | null; category: string | null; rights_status: string; width: number | null; height: number | null; bucket: string; storage_path: string };

function rowLabel(row: Record<string, unknown>) { return String(row.title ?? row.name ?? row.site_name ?? row.page_key ?? row.author_name ?? row.id); }
function inputValue(value: unknown) { if (value === null || value === undefined) return ""; if (typeof value === "boolean") return undefined; if (typeof value === "number") return String(value); return String(value); }
function FieldInput({ field, value, media }: { field: Field; value: unknown; media: MediaOption[] }) { const common = { name: field.key, required: field.required, defaultValue: inputValue(value), className: "mt-1 block w-full border border-[#c9bfa8] bg-white px-3 py-2 text-sm" }; if (field.type === "checkbox") return <label className="flex items-center gap-2 text-sm"><input name={field.key} type="checkbox" defaultChecked={value === true} />{field.label}</label>; if (field.type === "textarea") return <label className="block text-sm">{field.label}<textarea {...common} rows={4} /></label>; if (field.type === "media") return <label className="block text-sm">{field.label}<MediaPicker name={field.key} value={inputValue(value)} media={media} /></label>; if (field.type === "select") return <label className="block text-sm">{field.label}<select {...common}>{field.options?.map((option: string) => <option value={option} key={option}>{option}</option>)}</select></label>; return <label className="block text-sm">{field.label}<input {...common} type={field.type ?? "text"} /></label>; }

export default async function AdminResourcePage({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ resource: key }, rawSearchParams] = await Promise.all([params, searchParams]);
  const retired = retiredResourceRedirects[key];
  if (retired) redirect(retired);
  const resource = resourceFor(key);
  if (!resource) notFound();
  await requireAdmin(minRoleFor(resource));

  // A27: this page used to `select("*")` with no bounds, so a table with
  // hundreds of rows was rendered in full on every load and there was no way
  // to find one record without the browser's own find-in-page.
  const query = parseListQuery(rawSearchParams);
  const basePath = `/admin/${resource.key}`;
  const hasStatus = resourceHasStatus(resource);
  const searchFilter = buildSearchFilter(resource, query.search);
  const sortable = resource.fields.some((field) => field.key === "sort_order");
  const orderColumn = sortable ? "sort_order" : "created_at";
  const { from, to } = pageRange(query.page);

  const supabase = await createServerSupabaseClient();
  let rowQuery = supabase.from(resource.table).select("*", { count: "exact" }).order(orderColumn, { ascending: true }).range(from, to);
  if (searchFilter) rowQuery = rowQuery.or(searchFilter);
  if (hasStatus && query.status) rowQuery = rowQuery.eq("status", query.status);

  const [result, mediaResult] = await Promise.all([
    rowQuery,
    supabase.from("media").select("id,title,alt_text,category,rights_status,width,height,bucket,storage_path").eq("rights_status", "approved").order("created_at", { ascending: false }),
  ]);
  const media = (mediaResult.data ?? []) as MediaOption[];
  const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
  const total = result.count ?? rows.length;
  const page = paginationState(total, query.page);
  const filtered = Boolean(query.search || query.status);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-[#8a3a21]">CMS module</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl">{resource.label}</h1>
        </div>
        <p className="text-sm text-[#4d5649]">{total} record{total === 1 ? "" : "s"}{filtered ? " matching" : ""}</p>
      </div>

      {/* A plain GET form: filters live in the URL, so a filtered list can be
          bookmarked, shared and reloaded, and the page stays server-rendered. */}
      <form method="get" action={basePath} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Search
          <input name="q" type="search" defaultValue={query.search} placeholder={`Search ${resource.label.toLowerCase()}`} className="mt-1 block w-full min-w-[14rem] border border-[#c9bfa8] bg-white px-3 py-2 text-sm" />
        </label>
        {hasStatus ? (
          <label className="block text-sm">
            Status
            <select name="status" defaultValue={query.status} className="mt-1 block border border-[#c9bfa8] bg-white px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        ) : null}
        <button type="submit" className="border border-[#1f3426] px-4 py-2 text-sm font-semibold">Apply</button>
        {filtered ? <Link href={basePath} className="px-2 py-2 text-sm underline">Clear</Link> : null}
      </form>

      {/* A26: drag ordering, hidden while a filter is active — the action writes
          sort_order from the submitted position, so reordering a filtered subset
          would renumber it against rows that are not on screen. Pagination is
          safe because the action offsets by the page's first rank. */}
      {sortable && !filtered && rows.length > 1 ? (
        <details className="mt-6 border border-[#c9bfa8] bg-[#ede3d0] p-5">
          <summary className="cursor-pointer text-sm font-semibold">Reorder display order</summary>
          <p className="mt-3 text-sm text-[#4d5649]">Drag a row, or use the arrows, then save. This sets the order visitors see on the public site.</p>
          <div className="mt-4">
            <ResourceReorder resourceKey={resource.key} offset={from} action={reorderResource} items={rows.map((row) => ({ id: String(row.id), label: rowLabel(row) }))} />
          </div>
        </details>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {rows.length ? rows.map((row) => (
            <details className="border border-[#c9bfa8] bg-[#ede3d0] p-5" key={String(row.id)}>
              <summary className="cursor-pointer font-serif text-xl sm:text-2xl">{rowLabel(row)}</summary>
              <form action={saveResource} className="mt-6 grid gap-4">
                <UnsavedChangesGuard />
                <input type="hidden" name="resource" value={resource.key} />
                <input type="hidden" name="id" value={String(row.id)} />
                {resource.fields.map((field) => <FieldInput field={field} value={row[field.key]} media={media} key={field.key} />)}
                <div className="flex gap-3"><SubmitButton className="bg-[#1f3426] px-4 py-2 text-sm font-semibold text-white">Save changes</SubmitButton></div>
              </form>
              <form action={deleteResource} className="mt-3">
                <input type="hidden" name="resource" value={resource.key} />
                <input type="hidden" name="id" value={String(row.id)} />
                <DeleteButton>Delete record</DeleteButton>
              </form>
            </details>
          )) : (
            <p className="border border-dashed border-[#c9bfa8] p-6 text-sm text-[#4d5649]">
              {filtered ? "No records match these filters." : `No ${resource.label.toLowerCase()} records yet. Use the form to add the first one.`}
            </p>
          )}

          {page.pageCount > 1 ? (
            <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dde0d7] pt-4 text-sm">
              <p className="text-[#4d5649]">Showing {page.from}–{page.to} of {total}</p>
              <div className="flex flex-wrap items-center gap-2">
                {page.hasPrevious ? <Link href={listHref(basePath, query, { page: page.current - 1 })} className="border border-[#1f3426] px-3 py-1.5 font-semibold">Previous</Link> : <span className="border border-[#dde0d7] px-3 py-1.5 text-[#98a096]">Previous</span>}
                <span className="px-1">Page {page.current} of {page.pageCount}</span>
                {page.hasNext ? <Link href={listHref(basePath, query, { page: page.current + 1 })} className="border border-[#1f3426] px-3 py-1.5 font-semibold">Next</Link> : <span className="border border-[#dde0d7] px-3 py-1.5 text-[#98a096]">Next</span>}
              </div>
            </nav>
          ) : null}
        </div>

        <form action={saveResource} className="h-fit grid gap-4 border border-[#c9bfa8] bg-[#e8dfca] p-6">
          <UnsavedChangesGuard />
          <h2 className="font-serif text-2xl sm:text-3xl">Add {resource.label}</h2>
          <input type="hidden" name="resource" value={resource.key} />
          {resource.fields.map((field) => <FieldInput field={field} key={field.key} value={undefined} media={media} />)}
          <SubmitButton className="bg-[#b65d40] px-4 py-3 text-sm font-semibold text-white" pendingLabel="Creating…">Create record</SubmitButton>
        </form>
      </div>
    </section>
  );
}
