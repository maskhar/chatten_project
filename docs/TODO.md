# Roadmap

## Phase 1 — Foundation & Infrastructure
- [x] Next.js, Tailwind, Supabase client, Docker foundation
- [x] Custom schema, tables, RLS, PostgREST exposure, media bucket
- [x] Minimal routes and Phase 1 seed data
- [ ] Generate database TypeScript types after future schema changes

## Phase 2 — Public Homepage
- [x] Build Panoramic Editorial homepage
- [x] Add CMS-backed server data layer and responsive homepage sections
- [x] Confirm application Docker build after Phase 1 fix
## Phase 3 — Public Pages & SEO
- [x] Build public listing and detail pages
- [x] Add metadata, canonical strategy, robots, sitemap, JSON-LD, and OG fallback
- [ ] Verify live browser rendering with local Supabase environment
## Phase 4 — Management Dashboard & CRUD
- [x] Build role-aware CMS shell, content CRUD modules, account, and logout
- [x] Add self-hosted Storage media upload/delete workflow
- [x] Add Users & Roles module with super-admin safeguards
- [x] Split directions and map embed contact URLs through migration
- [ ] Bootstrap first production super_admin through controlled database administration
## Phase 5 — Integration, QA & Production
- [x] Add liveness/readiness endpoints and Docker healthcheck
- [x] Add explicit CLI-only super-admin bootstrap workflow
- [x] Add database last-super-admin trigger protection
- [x] Add authenticated CMS draft preview route
- [x] Add automated bootstrap argument tests
- [x] Complete isolated database backup/restore drill
- [ ] Assign operator-selected first super_admin and complete authenticated CMS E2E verification
- [ ] Configure production domain/host and deploy Chatten application

- [x] Verify Node system-CA TLS path for self-hosted Supabase Auth Admin
- [x] Grant service_role custom-schema PostgREST privileges through migration
- [x] Verify exact-user bootstrap twice and preserve single super_admin role

- [ ] Operator-assisted Auth login/session/browser smoke verification
- [x] Add guarded temporary Auth provision/session/cleanup tooling

- [ ] Add operator-approved Chatten photography to content/chatten-media-import.json and map Hero, Moments, Gallery, Spaces, and Experiences
- [x] Add rights-aware media metadata and approved manifest importer

## Phase 6 — CMS Experience Refactor
- [ ] Complete dedicated domain editors, visual media manager, and operator-facing ordering across all CMS areas

- [x] Complete Homepage management drag ordering, visibility, and public integration
- [x] Complete Menu management categories, item workflows, ordering, availability, media, and price UX

- [x] Complete dedicated Gallery management ordering, editing, visibility, and safe deletion

- [x] Add Media Search to Media Library

- [x] Add Media Rights Filter

- [x] Add Media Usage Filter

- [x] Add Media Category Filter

- [x] Complete Media Library browsing/filtering

- [x] Structured Media Usage Core

- [x] Structured Media Usage Database Wiring

- [x] Media Detail Used In

- [x] Human-readable Media Delete Protection

- [x] Multi-file Upload Core

- [x] Multi-file Selection UI

- [x] Drag & Drop UI

- [x] Upload Queue / per-file result UI

- [x] Final Media Picker polish

- [x] Experiences Manager Core

- [x] Experience Ordering + Visibility + Delete

- [x] Close Experiences management verification

- [x] Spaces Manager Core
- [x] Space Ordering + Visibility + Delete
- [x] Spaces final closure

- [x] Events + Promotions Manager Core
- [x] Event + Promotion Temporal Ordering + Visibility + Delete

- [ ] About Manager

- [ ] Testimonials Manager

- [ ] Contact & Visit Manager

- [ ] Opening Hours Manager (day picker, not raw integer input)

- [ ] Social Links Manager (platform picker + ordering)

- [ ] Navigation Manager (route validation + ordering)

- [ ] SEO Manager (per-page fields + OG image selection)

- [ ] Site Settings Manager

---

# Deep Audit Remediation (audit 2026-09-21)

Source: full-project audit of public UI/UX, admin dashboard, database/RLS, and
application security. Items are ordered by blocking severity. `A#` identifiers are
stable references for commits and verification notes.

## Phase 7 — Critical Defects (live breakage, fix first)

- [x] **A1** Fix `media` ordering crash in Events/Promotions managers.
      `app/admin/(dashboard)/events/page.tsx:3` and
      `app/admin/(dashboard)/promotions/page.tsx:3` call
      `.from("media").order("sort_order")`, but `chatten_cafe.media` has no
      `sort_order` column (initial migration line 21). Every load raises
      PostgREST `42703 undefined_column`. Order by `created_at` like the sibling
      managers do.
- [x] **A2** Add self-read RLS policy to `chatten_cafe.user_roles`.
      The only policy is `role_manage` requiring `has_role('admin')`, so
      `requireAdmin()` (`lib/auth/require-admin.ts:3`), which reads the table with
      the RLS-bound session client, returns zero rows for an `editor`. Every
      `editor` account is redirected to `/admin/login?error=unauthorized` and can
      never enter the CMS. Add `own_role` (`for select using (user_id = auth.uid())`).
- [x] **A3** Add public read policy to `chatten_cafe.media`.
      `media` is absent from the `public_content` policy list; only `cms_manage`
      (editor) exists. Anonymous visitors receive zero media rows, so every
      CMS-managed image on the public site resolves to nothing. Add
      `public_media` (`for select using (rights_status = 'approved')`).
      Migration `supabase/migrations/20260921000100_fix_media_and_role_rls.sql`
      applied to the self-hosted server on 2026-09-21 (via SSH, `psql` against
      the `db` compose service). Confirmed with `pg_policies`: `public_media`
      (SELECT, public role) and `own_role` (SELECT, authenticated role) both
      exist alongside the original `cms_manage` / `role_manage` policies.
- [x] **A4** Filter `rights_status = 'approved'` in `lib/homepage/data.ts:11`
      (currently unfiltered, unlike `publicMedia()` in `lib/public-data/queries.ts:12`).
- [x] **A5** Verify A1–A4 end to end.
      DB-verified 2026-09-21: anon REST call to `chatten_cafe.media` returns
      rows filtered by `public_media` (no policy error, no leak of
      non-approved rows); `chatten_cafe.user_roles` returns 0 rows to anon
      (correct — `own_role` requires `auth.uid()`, null for anon) and would
      return exactly the caller's row for an authenticated member, since
      `own_role` is role-value-agnostic. Only one CMS member exists
      (`super_admin`, no `editor` account) so the editor-login path is
      verified by policy construction, not by a live editor session — create
      a test `editor` account if a literal login test is wanted.
      **New finding, not a code defect:** all 3 existing `chatten_cafe.media`
      rows have `rights_status = 'unknown'`; none are `approved`. A1–A4 are
      fixed, but the public homepage and Events/Promotions media pickers will
      still show zero images until an admin approves media rights in the CMS
      (Media Library → set rights status). Tracked as **A66** below.

## Phase 8 — Security Hardening

- [~] **A6** Storage read exposure on `chatten-media` — accepted risk, not fixed.
      `"chatten public read"` was unconditional (`using (bucket_id = 'chatten-media')`).
      Migration `20260921000200_restrict_chatten_media_storage_read.sql`
      (applied 2026-09-21) joined it to `chatten_cafe.media.rights_status =
      'approved'`, matching the `public_media` table policy. **Verified this
      does not close the actual hole**: the bucket has `public = true`, and
      self-hosted storage-api serves `/storage/v1/object/public/{bucket}/{path}`
      for a public bucket without evaluating RLS at all — confirmed by curling
      an `unknown`-rights object before *and after* the policy change; both
      returned `200`. Every image URL in the app (9 call sites, e.g.
      `lib/homepage/media.ts:2`, `lib/public-data/media.ts:6`,
      `components/admin/media-picker.tsx:70,163`) uses that same
      `object/public/...` path, so a real fix means either (a) a private
      bucket with server-generated signed URLs everywhere an image renders, or
      (b) splitting into a public bucket (approved only) and a private one
      (pending/restricted), migrating objects between them as rights_status
      changes. Both are multi-file architecture changes, not a migration.
      2026-09-21: presented both options to the project owner; **decision was
      to accept the risk and document it** rather than do the rewrite now —
      only 3 stock images exist today, none sensitive. The RLS policy fix
      stays applied (it is still strictly correct and closes the gap for any
      access path that *does* honor storage.objects RLS), but path enumeration
      of `storage_path` is enough to download any object in the bucket
      regardless of rights_status. Revisit if real/sensitive media is ever
      uploaded before this is actually fixed.
- [x] **A7** Add a minimum-role parameter to `requireAdmin()` and enforce
      `admin` on `app/admin/(dashboard)/users/page.tsx:5`, which currently gates
      only on "has any role" before constructing the RLS-bypassing service-role
      client and reading every member's email via `auth.admin.getUserById`.
- [x] **A8** Add explicit app-level role checks to `saveRole` and `removeRole`
      (`lib/admin/role-actions.ts:34-35`); today only the DB policy stops a
      non-admin, with no defense in depth (contrast `media-actions.ts:80`, which
      does check).
- [x] **A9** Split `editor` from `admin` on settings-class tables. Tighten
      `cms_manage` from `has_role('editor')` to `has_role('admin')` on
      `site_settings`, `seo_settings`, `navigation_items`, `social_links`,
      `contact_information`, and mirror the check in the matching server actions.
- [x] **A10** Gate the "Users & Roles" nav entry and page on role so non-admins
      do not see controls that always fail (`app/admin/(dashboard)/layout.tsx:4`).
- [x] **A11** Add `Content-Security-Policy` (with an explicit `frame-src`
      allowlist — `app/visit/page.tsx:9` renders a CMS-controlled map `<iframe>`),
      `Strict-Transport-Security`, and `poweredByHeader: false` in `next.config.ts`.
- [~] **A12** Document and configure GoTrue rate limits plus reverse-proxy
      throttling for `/auth/v1/*`; admin sign-in currently has no brute-force
      protection (`app/admin/login/login-form.tsx:6` posts straight to GoTrue).
      Documented, **not applied** — see "Auth brute-force protection" in
      `docs/DEPLOYMENT.md` for the exact variables and the Kong alternative.
      Confirmed 2026-09-21 that `supabase-auth` runs with no
      `GOTRUE_RATE_LIMIT_*` set. Blocked on an owner-scheduled maintenance
      window: the Supabase host is shared by several unrelated applications
      (25 buckets across projects) that all authenticate through the same
      `supabase-auth` container and `supabase-kong` gateway, so applying this
      restarts auth for every tenant, not just Chatten.
- [x] **A13** Validate URL fields against a scheme allowlist (`cta_url`,
      `whatsapp_url`, `directions_url`, `map_embed_url`, `href`, `canonical_url`,
      social `url`) — no URL is validated anywhere today, and `javascript:` is not
      blocked.
- [x] **A14** Add `middleware.ts` protecting `/admin/*` as defense in depth, so a
      future route handler under `app/admin/` cannot skip the layout-level check.

## Phase 9 — Dashboard Responsiveness & Completion

- [ ] **A15** Add a mobile navigation drawer to the CMS. The sidebar is
      `hidden … lg:block` (`app/admin/(dashboard)/layout.tsx:6`) with no hamburger
      control anywhere, so below 1024px there is no way to move between CMS
      sections at all. Highest-impact dashboard fix.
- [ ] **A16** Audit and fix admin table/form/toolbar overflow at `sm`/`md`
      (horizontal scroll wrappers, stacking, action buttons reachable on phone).
- [x] **A17** Repoint sidebar "Homepage" from `/admin/hero` to `/admin/homepage`
      (the real section manager, currently unreachable from navigation) and add a
      separate "Hero" entry.
- [x] **A18** Link `/admin/preview` from the sidebar (orphaned route).
- [ ] **A19** Fix dashboard overview quick links pointing at the weak generic
      routes (`app/admin/(dashboard)/page.tsx:3,5` → `/admin/menu-items`).
- [ ] **A20** Remove or redirect the `menu-categories` / `menu-items` generic
      resource keys (`lib/admin/resources.ts:10-11`), which bypass the dedicated
      manager's delete protection and `parseIdr` price parsing.
- [ ] **A21** Add `loading.tsx` to admin route segments (none exist today).
- [ ] **A22** Add success feedback. Four or more actions redirect with `?saved=1`
      but no page reads it, so saves complete with no confirmation.
- [ ] **A23** Add submit-pending state to admin forms still using plain
      `<form action={…}>` without `useFormStatus`/`useActionState`.
- [ ] **A24** Surface `error.message` in `app/admin/(dashboard)/error.tsx`;
      validation messages like "Event end must be after its start." are currently
      replaced by one generic sentence.
- [ ] **A25** Build a real dashboard overview: draft counts across all
      status-bearing tables (only `hero_slides` is checked today), recent activity
      from `updated_at`, publish status, and correct quick actions.
- [ ] **A26** Add drag ordering to generic-route resources by wiring the existing
      but entirely unused `reorderResource` (`lib/admin/actions.ts:9`) to
      `SortableList`; ordering is currently raw `sort_order` number entry.
- [ ] **A27** Add search/filter/pagination to list views (only Media Library has them).
- [ ] **A28** Expose DB fields that have no UI: `contact_information.email`,
      `seo_settings.og_media_id` (OG image is unmanageable today),
      `media.focal_x`/`focal_y`.
- [ ] **A29** Style `app/admin/(dashboard)/media/items/[id]/page.tsx` — the form
      has no Tailwind classes at all, unlike every other edit screen.
- [ ] **A30** Preserve the requested path across login redirects
      (`lib/auth/require-admin.ts:3` drops it, always landing on `/admin`).
- [ ] **A31** Add unsaved-changes warning to long-form admin editors.

## Phase 10 — Public Site UX, Content Sync & SEO

- [ ] **A32** Wire `seo_settings` into `lib/seo.ts` / `generateMetadata`. The CMS
      SEO editor is currently disconnected from the live site entirely.
- [ ] **A33** Resolve `navigation_items` and `social_links` centrally in
      `PublicShell`. Today only the homepage passes them, so every other page
      falls back to hardcoded links (`components/public/header.tsx:5`) and drops
      CMS social links — a direct violation of the CMS-managed content rule.
- [ ] **A34** Add `/about` and `/events` to navigation and footer; both are
      working content pages currently unreachable from any link.
- [ ] **A35** Replace the homepage's hand-rolled `<footer>`
      (`app/(public)/page.tsx:34`) with `PublicFooter`, restoring internal links
      on the highest-traffic page.
- [ ] **A36** Fix homepage landmarks: move `Header`/footer out of `<main>` so
      `banner` and `contentinfo` roles survive for screen readers.
- [ ] **A37** Add `generateMetadata` to `events/[slug]`, `experience/[slug]`,
      `spaces/[slug]`; all detail pages currently share one generic title.
- [ ] **A38** Render a hero image on Experience and Space detail pages — the list
      cards show imagery, the detail pages show none.
- [ ] **A39** Add `app/error.tsx` for the public tree and wrap the unguarded
      query helpers in `lib/public-data/queries.ts` like `getHomepageData` already does.
- [ ] **A40** Fix kicker contrast: `text-[#b26043]` on `#f4eedf` is ≈3.9:1,
      below the 4.5:1 AA threshold, and appears on nearly every page.
- [ ] **A41** Re-check `text-[#6c715d]` / `text-[#5b6254]` body and empty-state
      greys against AA.
- [ ] **A42** Migrate background-image rendering to `next/image` with `sizes`
      (hero, moments, cards, gallery, menu). Only Events uses it today; mobile
      currently downloads desktop-resolution originals throughout.
- [ ] **A43** Make hero heights mobile-first (`min-h-[760px]` and
      `py-36 sm:py-44` never shrink below the `sm` breakpoint).
- [ ] **A44** Enlarge the mobile menu button to a ≥44px touch target
      (`components/public/header.tsx:5`).
- [ ] **A45** Add `loading.tsx` to public routes (all are `force-dynamic`).
- [ ] **A46** Emit `LocalBusiness`/`Restaurant` JSON-LD from CMS contact/hours
      data; only a generic `WebSite` object is emitted today.
- [ ] **A47** Fail the production build (or warn loudly) when
      `NEXT_PUBLIC_APP_URL` is unset — it silently yields no canonical URLs, no OG
      tags, and an empty `sitemap.xml`.
- [ ] **A48** Add a skip-to-content link and `aria-current="page"` on active nav links.
- [ ] **A49** Reuse `components/ui/button.tsx` for public CTAs instead of
      hand-copied Tailwind (currently imported by no public page).

## Phase 11 — Database Integrity & Type Safety

- [ ] **A50** Add the missing `media` foreign keys. `image_media_id` on
      `hero_slides`, `moments`, `about_sections`, `experiences`, `spaces`,
      `menu_items`, `gallery_items` and `seo_settings.og_media_id` are bare `uuid`
      columns with no FK; referential integrity is app-layer only.
- [ ] **A51** Repair `20260909000600_add_event_promotion_media.sql`, which is a
      silent no-op: `add column if not exists` skips the whole clause (including
      `references`) because the column already existed, so `events`/`promotions`
      never got their FK.
- [ ] **A52** Replace the placeholder `types/database.ts`
      (`Record<string, unknown>` for every table) with generated types, and add a
      CI check. This is the root cause that let A1 ship undetected.
- [ ] **A53** Add `alter default privileges` for `anon`/`authenticated` so new
      tables are not silently unreadable (only `service_role` has defaults today).
- [ ] **A54** Add `force row level security` on `chatten_cafe` tables.
- [ ] **A55** Add `own_profile_insert` policy to `profiles` (INSERT currently
      works only because the `handle_new_user` trigger is `SECURITY DEFINER`).
- [ ] **A56** Add index on `menu_items.category_id` (FK filtered on every
      reorder, insert, and delete guard).
- [ ] **A57** Push `is_active`/`status` filtering into public queries instead of
      filtering in JS (`about_sections` is never filtered at all).
- [ ] **A58** Batch reorder writes; every reorder action issues one UPDATE per
      row, several doing a two-pass staging round trip.
- [x] **A59** Replace per-row `auth.admin.getUserById` in
      `app/admin/(dashboard)/users/page.tsx:5` with a single `listUsers()`.
- [ ] **A60** Look up public detail pages by `.eq("slug", …)` instead of fetching
      the whole collection and `Array.find`.
- [ ] **A61** Adopt shared Zod schemas across server actions. Zod is currently
      used only for env parsing; `status` is unchecked in several actions, UUIDs
      are checked inconsistently, and `Number(input)` has no `NaN` guard.
- [ ] **A62** Drop the dead `contact_information.map_url` column.
- [ ] **A63** Add `opening_hours` consistency CHECK (`is_closed` vs
      `opens_at`/`closes_at`, and `closes_at > opens_at`).
- [ ] **A64** Add partial indexes for the public `is_active AND status` filters.
- [ ] **A65** Document the `prevent_last_super_admin_removal` cascade behaviour:
      deleting the last super_admin's auth user fails the whole cascade with a raw
      trigger exception.
- [ ] **A66** Approve rights status on existing media (data, not code). All 3
      rows in `chatten_cafe.media` are `rights_status = 'unknown'` as of
      2026-09-21 — found while verifying A5. `public_media` and the app's
      `.eq("rights_status", "approved")` filters are working as designed, but
      with zero approved rows the homepage, Events, and Promotions media
      pickers render with no images until someone reviews and approves media
      in the CMS Media Library.

## Migration process note

`20260910000100_event_promotion_ordering.sql` created a unique index over a
column defaulting to `0`, which would raise `23505` on the second insert; it was
reverted by `…000200`. Net effect is zero, but intermediate migration steps must
never leave a unique index over a non-unique default — squash such pairs before
shipping.
