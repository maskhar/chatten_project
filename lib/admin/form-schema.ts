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

/** A strict HTML checkbox encoding: only values the admin forms emit are valid. */
export const checkboxSchema = z.enum(["on", "true", "false", ""]);

/** Parses a checkbox without treating arbitrary tampered values as false. */
export function parseCheckbox(input: FormDataEntryValue | null, label: string) {
  const raw = typeof input === "string" ? input : "";
  const result = checkboxSchema.safeParse(raw);
  if (!result.success) throw new Error(`${label} tidak valid.`);
  return raw === "on" || raw === "true";
}

/**
 * A visibility toggle's explicit `"true"`/`"false"` hidden field.
 *
 * Every toggle action used to read `String(formData.get("active")) === "true"`,
 * so a missing or tampered field was read as `false` — a request that did not
 * name a state at all hid the row from the public site, and the operator saw a
 * successful save. The value must be stated.
 */
export function parseBooleanFlag(input: FormDataEntryValue | null, label: string) {
  const raw = typeof input === "string" ? input : "";
  if (raw !== "true" && raw !== "false") throw new Error(`${label} tidak valid.`);
  return raw === "true";
}

/**
 * The CMS roles, mirroring `check (role in ('super_admin','admin','editor'))`
 * on `chatten_cafe.user_roles` in 20260909000100_initial_chatten_cafe.sql.
 */
export const CMS_ROLE_VALUES = ["super_admin", "admin", "editor"] as const;
export type CmsRoleValue = (typeof CMS_ROLE_VALUES)[number];
export const roleSchema = z.enum(CMS_ROLE_VALUES);

/** Parses a role instead of casting an arbitrary string to the union. */
export function parseRole(input: FormDataEntryValue | null, label: string): CmsRoleValue {
  const raw = typeof input === "string" ? input : "";
  const result = roleSchema.safeParse(raw);
  if (!result.success) throw new Error(`${label} tidak valid.`);
  return result.data;
}

/** An HTML checkbox posts `"on"` when ticked and nothing at all when not. */
export function checkboxValue(input: FormDataEntryValue | null) {
  return input === "on" || input === "true";
}

/** Parses an optional UUID foreign key, mapping a blank field to null. */
export function parseOptionalUuid(input: FormDataEntryValue | null, label: string) {
  return parseField(optionalUuidSchema, input, label);
}

/** Parses a required UUID primary or foreign key. */
export function parseUuid(input: FormDataEntryValue | null, label: string) {
  return parseField(uuidSchema, input, label);
}

/** Parses operator text consistently and names the field on failure. */
export function parseRequiredText(input: FormDataEntryValue | null, label: string) {
  return parseField(requiredTextSchema, input, label);
}

/** Parses optional operator text consistently, mapping blank input to null. */
export function parseOptionalText(input: FormDataEntryValue | null, label: string) {
  return parseField(optionalTextSchema, input, label);
}

/**
 * The one slug rule for every dedicated editor.
 *
 * Each action carried its own copy (`slugify`, `slugifyEvent`,
 * `slugifyPromotion`), all identical, so a change to one silently diverged
 * from the rest while every table's `slug` column stays `not null unique`.
 */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Derives the slug the row should carry, falling back to the display name.
 *
 * Throws in Indonesian rather than letting an empty slug reach a `not null`
 * column, which surfaced to the operator as a generic save failure.
 */
export function parseSlug(input: FormDataEntryValue | null, fallback: string, label: string) {
  const raw = typeof input === "string" && input.trim() !== "" ? input : fallback;
  const slug = slugify(raw);
  if (!slug) throw new Error(`${label} wajib diisi dan harus memuat huruf atau angka.`);
  return slug;
}

/**
 * A timestamptz value from a `datetime-local` input.
 *
 * `new Date("")` is Invalid Date and `new Date("abc")` likewise; both used to
 * be caught per action with slightly different English wording. Required
 * fields (`events.starts_at` is `not null`) fail closed here instead of
 * reaching Postgres.
 */
export function parseTimestamp(input: FormDataEntryValue | null, label: string, options: { required: true }): string;
export function parseTimestamp(input: FormDataEntryValue | null, label: string, options?: { required?: false }): string | null;
export function parseTimestamp(input: FormDataEntryValue | null, label: string, options?: { required?: boolean }): string | null {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) {
    if (options?.required) throw new Error(`${label} wajib diisi.`);
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} tidak valid.`);
  return date.toISOString();
}

/** Mirrors the `ends_at >= starts_at` CHECK both editorial tables carry. */
export function assertRange(startsAt: string | null, endsAt: string | null, label: string) {
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    throw new Error(`Waktu selesai ${label} harus setelah waktu mulai.`);
  }
}

/**
 * The check every permission-sensitive mutation needs.
 *
 * PostgREST reports `error: null` when RLS filters every candidate row away,
 * so an update or delete an editor is not allowed to perform used to look
 * exactly like a success — the UI re-rendered as if the change had landed and
 * the next page load reverted it. Requiring an exact affected-row count turns
 * that silence into a message.
 */
export function assertAffectedRows(count: number | null, expected: number, notFoundMessage: string) {
  if (count !== expected) throw new Error(notFoundMessage);
}

/**
 * Parses one form field and throws a message naming the field.
 *
 * Server actions surface a thrown Error to the editor, so the message is user
 * visible: "Urutan tampil tidak valid." beats Zod's default issue dump, and
 * beats the PostgREST error the unvalidated value used to produce. The CMS is
 * operated in Indonesian, so the message is too.
 */
export function parseField<T>(schema: z.ZodType<T>, input: FormDataEntryValue | null, label: string): T {
  const result = schema.safeParse(typeof input === "string" ? input : (input ?? ""));
  if (!result.success) throw new Error(`${label} tidak valid.`);
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
  if (!result.success) throw new Error(`Nilai ${options.label ?? "status"} tidak valid.`);
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
