import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { editorialTables, mergeActivity, toActivityEntries, type ActivityEntry, type DraftGroup } from "@/lib/admin/overview-tables";

export type { ActivityEntry, DraftGroup };

// `head: true` with `count: "exact"` asks PostgREST for the count only, so
// these stay cheap as content grows.
async function countRows(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, table: string, draftsOnly: boolean) {
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

export async function loadMediaHealth() {
  const supabase = await createServerSupabaseClient();
  const [total, pending] = await Promise.all([
    supabase.from("media").select("id", { count: "exact", head: true }),
    // Anything not explicitly approved is not served to the public site at all
    // since A6, so it is the number worth surfacing — not the library total.
    supabase.from("media").select("id", { count: "exact", head: true }).neq("rights_status", "approved"),
  ]);
  return { total: total.count ?? 0, pending: pending.count ?? 0 };
}
