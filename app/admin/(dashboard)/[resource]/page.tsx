import { saveResource, deleteResource, reorderResource } from "@/lib/admin/actions";
import { minRoleFor, resourceFor, retiredResourceRedirects, type Field } from "@/lib/admin/resources";
import { buildSearchFilter, listHref, pageRange, paginationState, parseListQuery, resourceHasStatus } from "@/lib/admin/list-query";
import { isReorderableTable } from "@/lib/admin/reorder-core";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dynamicTable } from "@/lib/supabase/dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { SubmitButton } from "@/components/admin/submit-button";
import { MediaPicker } from "@/components/admin/media-picker";
import { ResourceReorder } from "@/components/admin/resource-reorder";
import { ActionForm } from "@/components/admin/action-form";

type MediaOption = { id: string; title: string | null; alt_text: string | null; category: string | null; width: number | null; height: number | null; bucket: string; storage_path: string };

function rowLabel(row: Record<string, unknown>) { return String(row.title ?? row.name ?? row.site_name ?? row.page_key ?? row.author_name ?? row.id); }
function inputValue(value: unknown) { if (value === null || value === undefined) return ""; if (typeof value === "boolean") return undefined; if (typeof value === "number") return String(value); return String(value); }
// Phase 6: a field may now declare labelled `choices` instead of bare
// `options`, so a closed set is a picker showing "Sunday" rather than a
// number box, and `help` puts the explanation under the input instead of
// leaving the editor to guess what a key like page_key has to match.
function FieldHelp({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return <span id={id} className="mt-1 block text-xs text-ink">{text}</span>;
}

function FieldInput({ field, value, media }: { field: Field; value: unknown; media: MediaOption[] }) {
  const helpId = field.help ? `${field.key}-help` : undefined;
  const common = {
    name: field.key,
    required: field.required,
    defaultValue: inputValue(value),
    "aria-describedby": helpId,
    className: "mt-1 block w-full border border-line bg-white px-3 py-2 text-sm",
  };
  if (field.type === "checkbox") {
    return (
      <div className="text-sm">
        <label className="flex items-center gap-2"><input name={field.key} type="checkbox" defaultChecked={value === true} aria-describedby={helpId} />{field.label}</label>
        <FieldHelp id={helpId ?? ""} text={field.help} />
      </div>
    );
  }
  if (field.type === "textarea") return <label className="block text-sm">{field.label}<textarea {...common} rows={4} /><FieldHelp id={helpId ?? ""} text={field.help} /></label>;
  if (field.type === "media") return <label className="block text-sm">{field.label}<MediaPicker name={field.key} value={inputValue(value)} media={media} /><FieldHelp id={helpId ?? ""} text={field.help} /></label>;
  if (field.type === "select") {
    // A required select with no stored value must start on a blank prompt, or
    // the browser reports the first option as chosen when the editor never
    // touched it.
    const current = inputValue(value);
    const choices = field.choices ?? field.options?.map((option) => ({ value: option, label: option }));
    const needsPrompt = field.required && !current;
    return (
      <label className="block text-sm">
        {field.label}
        <select {...common} defaultValue={current}>
          {needsPrompt ? <option value="">Pilih {field.label.toLowerCase()}…</option> : null}
          {choices?.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
        </select>
        <FieldHelp id={helpId ?? ""} text={field.help} />
      </label>
    );
  }
  return <label className="block text-sm">{field.label}<input {...common} type={field.type ?? "text"} /><FieldHelp id={helpId ?? ""} text={field.help} /></label>;
}

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
  // Two different questions. A sort_order column decides what the list is
  // ordered by; whether the drag panel appears depends on the action's
  // allowlist. opening_hours has the column but is unique on
  // (day_of_week, sort_order), so reorderResource refuses it — rendering the
  // panel from the column alone gave the operator a control that dragged,
  // saved, failed, and rolled back.
  const ordered = resource.fields.some((field) => field.key === "sort_order");
  const sortable = ordered && isReorderableTable(resource.table);
  const orderColumn = ordered ? "sort_order" : "created_at";
  const { from, to } = pageRange(query.page);

  const supabase = await createServerSupabaseClient();
  let rowQuery = dynamicTable(supabase, resource.table).select("*", { count: "exact" }).order(orderColumn, { ascending: true }).range(from, to);
  if (searchFilter) rowQuery = rowQuery.or(searchFilter);
  if (hasStatus && query.status) rowQuery = rowQuery.eq("status", query.status);

  const [result, mediaResult] = await Promise.all([
    rowQuery,
    supabase.from("media").select("id,title,alt_text,category,width,height,bucket,storage_path").order("created_at", { ascending: false }),
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
          <p className="text-xs uppercase tracking-[.2em] text-rust">Modul CMS</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl">{resource.label}</h1>
          {resource.description ? <p className="mt-2 max-w-prose text-sm text-ink">{resource.description}</p> : null}
        </div>
        <p className="text-sm text-ink">{total} data{filtered ? " yang cocok" : ""}</p>
      </div>

      {/* A plain GET form: filters live in the URL, so a filtered list can be
          bookmarked, shared and reloaded, and the page stays server-rendered. */}
      <form method="get" action={basePath} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Cari
          <input name="q" type="search" defaultValue={query.search} placeholder={`Cari ${resource.label.toLowerCase()}`} className="mt-1 block w-full min-w-[14rem] border border-line bg-white px-3 py-2 text-sm" />
        </label>
        {hasStatus ? (
          <label className="block text-sm">
            Status
            <select name="status" defaultValue={query.status} className="mt-1 block border border-line bg-white px-3 py-2 text-sm">
              <option value="">Semua</option>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </label>
        ) : null}
        <button type="submit" className="border border-forest px-4 py-2 text-sm font-semibold">Terapkan</button>
        {filtered ? <Link href={basePath} className="px-2 py-2 text-sm underline">Hapus filter</Link> : null}
      </form>

      {/* A26: drag ordering, hidden while a filter is active — the action writes
          sort_order from the submitted position, so reordering a filtered subset
          would renumber it against rows that are not on screen. Pagination is
          safe because the action offsets by the page's first rank. */}
      {sortable && !filtered && rows.length > 1 ? (
        <details className="mt-6 border border-line bg-sand p-5">
          <summary className="cursor-pointer text-sm font-semibold">Ubah urutan tampilan</summary>
          <p className="mt-3 text-sm text-ink">Seret sebuah baris, atau pakai tombol panah, lalu simpan. Urutan ini yang dilihat pengunjung di situs publik.</p>
          <div className="mt-4">
            <ResourceReorder resourceKey={resource.key} offset={from} action={reorderResource} items={rows.map((row) => ({ id: String(row.id), label: rowLabel(row) }))} />
          </div>
        </details>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {rows.length ? rows.map((row) => (
            <details className="border border-line bg-sand p-5" key={String(row.id)}>
              <summary className="cursor-pointer break-words font-serif text-xl sm:text-2xl">{rowLabel(row)}</summary>
              <ActionForm action={saveResource} className="mt-6 grid gap-4">
                <input type="hidden" name="resource" value={resource.key} />
                <input type="hidden" name="id" value={String(row.id)} />
                {resource.fields.map((field) => <FieldInput field={field} value={row[field.key]} media={media} key={field.key} />)}
                <div className="flex gap-3"><SubmitButton className="bg-forest px-4 py-2 text-sm font-semibold text-white">Simpan perubahan</SubmitButton></div>
              </ActionForm>
              <form action={deleteResource} className="mt-3">
                <input type="hidden" name="resource" value={resource.key} />
                <input type="hidden" name="id" value={String(row.id)} />
                <DeleteButton>Hapus data</DeleteButton>
              </form>
            </details>
          )) : (
            <p className="border border-dashed border-line p-6 text-sm text-ink">
              {filtered ? "Tidak ada data yang cocok dengan filter ini." : `Belum ada data ${resource.label.toLowerCase()}. Gunakan formulir di samping untuk menambah yang pertama.`}
            </p>
          )}

          {page.pageCount > 1 ? (
            <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4 text-sm">
              <p className="text-ink">Menampilkan {page.from}–{page.to} dari {total}</p>
              <div className="flex flex-wrap items-center gap-2">
                {page.hasPrevious ? <Link href={listHref(basePath, query, { page: page.current - 1 })} className="border border-forest px-3 py-1.5 font-semibold">Sebelumnya</Link> : <span className="border border-mist px-3 py-1.5 text-ink-dim">Sebelumnya</span>}
                <span className="px-1">Halaman {page.current} dari {page.pageCount}</span>
                {page.hasNext ? <Link href={listHref(basePath, query, { page: page.current + 1 })} className="border border-forest px-3 py-1.5 font-semibold">Berikutnya</Link> : <span className="border border-mist px-3 py-1.5 text-ink-dim">Berikutnya</span>}
              </div>
            </nav>
          ) : null}
        </div>

        <ActionForm action={saveResource} className="h-fit grid gap-4 border border-line bg-sand p-6">
          <h2 className="font-serif text-2xl sm:text-3xl">Tambah {resource.label}</h2>
          <input type="hidden" name="resource" value={resource.key} />
          {resource.fields.map((field) => <FieldInput field={field} key={field.key} value={undefined} media={media} />)}
          <SubmitButton className="bg-terracotta px-4 py-3 text-sm font-semibold text-white" pendingLabel="Menyimpan…">Buat data</SubmitButton>
        </ActionForm>
      </div>
    </section>
  );
}
