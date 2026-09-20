import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TableName } from "@/types/tables";

/**
 * A query builder for a table chosen at runtime.
 *
 * The generic CMS actions resolve `resource.table` from a form submission, so
 * the table is a union of every entry in `lib/admin/resources.ts` rather than
 * one literal. supabase-js types `.eq()`/`.update()` against the *intersection*
 * of that union's columns, which is close to empty — even `id`, which every
 * table has, is rejected, because the intersection is computed over the Row
 * types rather than over the columns they share.
 *
 * This is the one place that steps around it. It is deliberately narrow:
 *
 * - The table name is still `TableName`, so it cannot be an arbitrary string
 *   and cannot reach a table outside `chatten_cafe`. That is the check that
 *   matters — it is the CMS write allowlist.
 * - Only the *column* types are relaxed, and only for the handful of actions
 *   that genuinely do not know their table at compile time. Every query that
 *   names its table as a literal keeps full column checking.
 *
 * Do not reach for this to silence an error on a query that knows its table.
 * There, the error is real.
 */
export function dynamicTable(client: SupabaseClient<Database, "chatten_cafe">, table: TableName) {
  return (client as unknown as SupabaseClient).from(table);
}
