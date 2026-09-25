// Audit remediation A61: the shared input vocabulary for admin server actions.
//
// Zod was already a dependency but only parsed environment variables. Every
// server action hand-rolled its own checks, and they disagreed:
//
//   - `status` was validated in saveSpace, saveEvent and savePromotion, and
//     not at all in saveExperience, saveGalleryItem, saveMenuItem or the
//     generic saveResource. Those four wrote `String(formData.get("status"))`
//     straight into a column with a CHECK constraint, so a tampered form
//     surfaced as "Unable to save content" with no indication why.
//   - UUIDs were matched with `/^[0-9a-f-]{36}$/i`, which accepts any
//     36-character run of hex digits and dashes — a string of 36 dashes
//     passed it — and several actions did not check ids at all.
//   - `Number(input)` in the generic action's `value()` helper has no NaN
//     guard. A non-numeric sort_order, day_of_week or price became NaN, which
//     serialises to `null` in JSON: sort_order and day_of_week are NOT NULL,
//     so the row was rejected by the database rather than by the form.
//
// This module is pure — no `server-only` import, no Supabase — so the rules
// can be covered by node:test without a database. Actions import from here.

import { z } from "zod";

/**
 * The editorial workflow states. Mirrors the
 * `check (status in ('draft','published'))` constraint that every editorial
 * table in 20260909000100_initial_chatten_cafe.sql carries.
 */
export const STATUS_VALUES = ["draft", "published"] as const;
export type Status = (typeof STATUS_VALUES)[number];

/**
 * Defaults to `draft`, deliberately. An absent or tampered status must not
 * publish anything: saveGalleryItem used to default to `"published"`, so a
 * form posted without the field put the item straight on the public site
 * without passing through review.
 */
export const statusSchema = z.enum(STATUS_VALUES).catch("draft");

/** Rejects a status the database would reject, rather than defaulting it. */
export const strictStatusSchema = z.enum(STATUS_VALUES);

export const uuidSchema = z.uuid();

/** An optional id: `""` from an empty hidden field means "creating", not "invalid". */
export const optionalUuidSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value === "" || uuidSchema.safeParse(value).success, "Invalid ID.")
  .transform((value) => (value === "" ? null : value));

/**
 * Turns a text input into a finite number, or fails.
 *
 * This is the guard the old `Number(input)` lacked. `Number("")` is 0 and
 * `Number("abc")` is NaN; NaN then serialises to null in the request body, so
 * a typo in a sort_order box came back as a NOT NULL violation from Postgres
 * rather than as a message about the field.
 */
const numeric = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value !== "" && Number.isFinite(Number(value)), "Not a number.")
  .transform((value) => Number(value));

/** A non-negative integer from a text input. */
export const nonNegativeIntSchema = numeric.pipe(z.number().int().min(0));

/** 0 (Sunday) through 6 (Saturday), matching `opening_hours.day_of_week`. */
export const dayOfWeekSchema = numeric.pipe(z.number().int().min(0).max(6));

/** `numeric(10,2)` with `check (price is null or price >= 0)`. */
export const priceSchema = numeric.pipe(z.number().min(0).max(99999999.99));

/** Trims, then maps blank to null so an emptied optional field clears the column. */
export const optionalTextSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value));

export const requiredTextSchema = z.string().transform((value) => value.trim()).pipe(z.string().min(1));

/** An HTML checkbox posts `"on"` when ticked and nothing at all when not. */
export function checkboxValue(input: FormDataEntryValue | null) {
  return input === "on" || input === "true";
}

/**
 * Parses one form field and throws a message naming the field.
 *
 * Server actions surface a thrown Error to the editor, so the message is user
 * visible: "Sort order is invalid." beats Zod's default issue dump, and beats
 * the PostgREST error the unvalidated value used to produce.
 */
export function parseField<T>(schema: z.ZodType<T>, input: FormDataEntryValue | null, label: string): T {
  const result = schema.safeParse(typeof input === "string" ? input : (input ?? ""));
  if (!result.success) throw new Error(`${label} is invalid.`);
  return result.data;
}

/**
 * The status a payload should carry, given what the form posted.
 *
 * Kept as a function rather than inlined so every action reaches the same
 * default. `strict` is for the actions that already rejected a bad status and
 * should keep doing so rather than silently downgrading to draft.
 */
export function parseStatus(input: FormDataEntryValue | null, options?: { strict?: boolean; label?: string }): Status {
  const raw = typeof input === "string" ? input : "";
  if (!options?.strict) return statusSchema.parse(raw === "" ? "draft" : raw);
  const result = strictStatusSchema.safeParse(raw === "" ? "draft" : raw);
  if (!result.success) throw new Error(`Invalid ${options.label ?? "status"}.`);
  return result.data;
}

/**
 * The generic CMS action's field coercion, with the NaN hole closed.
 *
 * Returns `null` for an absent or blank value — the caller drops nulls from
 * the payload so the column keeps its default — and throws for a value that
 * is present but not parseable, which is the case `Number()` used to pass
 * through as NaN.
 *
 * A81: `status` is parsed strictly here. The lenient form silently rewrote a
 * tampered value to `draft`, so unpublishing a live row looked identical to a
 * successful save — the generic form only ever posts one of the two declared
 * options, so anything else is a tampered request, not a typo to absorb.
 */
export function coerceFieldValue(field: string, input: FormDataEntryValue | null, label = field): string | number | null {
  if (input === null || input === "") return null;
  const raw = typeof input === "string" ? input : "";
  if (field === "day_of_week") return parseField(dayOfWeekSchema, raw, label);
  if (field === "sort_order") return parseField(nonNegativeIntSchema, raw, label);
  if (field === "price") return parseField(priceSchema, raw, label);
  if (field === "status") return parseStatus(raw, { strict: true, label });
  return raw;
}
