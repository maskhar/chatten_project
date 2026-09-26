import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { editorialTables, mergeActivity, toActivityEntries, type ActivityEntry, type DraftGroup } from "@/lib/admin/overview-tables";
import { loadMediaUsageMap } from "@/lib/media/usage-server";
import type { StatusTableName } from "@/types/tables";

export type { ActivityEntry, DraftGroup };

// `head: true` with `count: "exact"` asks PostgREST for the count only, so
// these stay cheap as content grows.
async function countRows(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, table: StatusTableName, draftsOnly: boolean) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (draftsOnly) query = query.eq("status", "draft");
  const { count } = await query;
  return count ?? 0;
}

export async function loadDraftGroups(): Promise<DraftGroup[]> {
  const supabase = await createServerSupabaseClient();
  return Promise.all(
    editorialTables.map(async (entry) => {
      const [drafts, total] = await Promise.all([countRows(supabase, entry.table, true), countRows(supabase, entry.table, false)]);
      return { label: entry.label, href: entry.href, drafts, total };
    }),
  );
}

export async function loadRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  const supabase = await createServerSupabaseClient();
  // Fanned out per table so every row still arrives through the caller's own
  // RLS policies rather than a view with its own.
  const perTable = await Promise.all(
    editorialTables.map(async (entry) => {
      const { data } = await supabase
        .from(entry.table)
        .select(`id,status,updated_at,${entry.titleColumn}`)
        .order("updated_at", { ascending: false })
        .limit(limit);
      return toActivityEntries(entry, (data ?? []) as unknown as Record<string, unknown>[]);
    }),
  );
  return mergeActivity(perTable, limit);
}

// The tile used to count media awaiting rights approval. 20260921000500
// removed that gate — an uploaded image is publishable — so the count was
// always zero and told the operator nothing. What is worth surfacing instead
// is the opposite gap: images sitting in the library that no content row
// points at, which is the actual reason a section still looks empty.
export async function loadMediaHealth() {
  const supabase = await createServerSupabaseClient();
  const [total, usage] = await Promise.all([
    supabase.from("media").select("id", { count: "exact", head: true }),
    loadMediaUsageMap(),
  ]);
  const count = total.count ?? 0;
  return { total: count, unused: Math.max(0, count - usage.size) };
}
