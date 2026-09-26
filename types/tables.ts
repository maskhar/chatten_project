import type { Database } from "./database";

// Derived helpers live here rather than in database.ts, which is generated
// wholesale by `npm run types:generate` and must stay byte-identical to the
// generator's output for `npm run types:check` to be meaningful.

export type Schema = Database["chatten_cafe"];

/**
 * Every table in `chatten_cafe`, as the generated types see it.
 *
 * Helpers that take a table name must use this rather than `string`. The
 * supabase-js `.from()` overloads are keyed on the literal table name, and a
 * plain `string` does not match any of them — it falls through to the
 * `(relation: never)` overload, which makes the returned builder `never` and
 * silently degrades every `.eq()`/`.order()` column argument after it to
 * unchecked. That is how A1 shipped: the placeholder `Record<string, unknown>`
 * types had the same effect everywhere at once.
 */
export type TableName = keyof Schema["Tables"];

/**
 * The tables that actually carry a `status` column, derived from the generated
 * types rather than hand-listed so it cannot drift from the schema. Anything
 * filtering on `status = 'published'` should use this: `menu_categories`,
 * `opening_hours`, `social_links` and `navigation_items` have no such column,
 * and asking PostgREST for it is a runtime error, not a missing filter.
 */
export type StatusTableName = {
  [K in TableName]: "status" extends keyof Schema["Tables"][K]["Row"] ? K : never;
}[TableName];

export type Row<T extends TableName> = Schema["Tables"][T]["Row"];
export type Insert<T extends TableName> = Schema["Tables"][T]["Insert"];
export type Update<T extends TableName> = Schema["Tables"][T]["Update"];
