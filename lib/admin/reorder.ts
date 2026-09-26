import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REORDERABLE_TABLES, isReorderableTable, normalizeOffset, type ReorderableTable, validateReorderIds } from "./reorder-core";

export { REORDERABLE_TABLES, isReorderableTable, normalizeOffset, type ReorderableTable };

/**
 * A58: applies a new display order in one statement.
 *
 * Each reorder action used to issue one UPDATE per row, and most did it twice
 * — a staging pass into sort_order = 100000 + index, then the real values —
 * so reordering twelve rows was twenty-four separate round trips and
 * twenty-four separate transactions. An interruption between the two passes
 * left every row parked in the staging range, which the public site renders as
 * an arbitrary order.
 *
 * `chatten_cafe.reorder_rows` does the whole thing as one atomic UPDATE. It is
 * SECURITY INVOKER, so the caller's own RLS policies still decide whether any
 * row may be written; an editor without permission updates nothing rather than
 * being silently elevated.
 */
export async function applyOrder(table: ReorderableTable, ids: string[], offset = 0, label = "urutan") {
  validateReorderIds(ids, label);
  if (!ids.length) return 0;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("reorder_rows", {
    target_table: table,
    ids,
    start_offset: offset,
  });

  if (error) throw new Error(`Gagal menyimpan ${label}.`);

  // RLS returning zero rows for a non-empty list means the caller could not
  // write them. Reporting success there would show the editor a reordered
  // list that reverts on the next load.
  const affected = typeof data === "number" ? data : 0;
  if (affected !== ids.length) throw new Error(`Gagal menyimpan ${label}.`);
  return affected;
}
