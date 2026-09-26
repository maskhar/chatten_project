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

- [ ] Add real Chatten photography to content/chatten-media-import.json and map Hero, Moments, Gallery, Spaces, and Experiences
- [x] Add media metadata and manifest importer

## Phase 6 — CMS Experience Refactor
- [x] Complete dedicated domain editors, visual media manager, and operator-facing ordering across all CMS areas

- [x] Complete Homepage management drag ordering, visibility, and public integration
- [x] Complete Menu management categories, item workflows, ordering, availability, media, and price UX

- [x] Complete dedicated Gallery management ordering, editing, visibility, and safe deletion

- [x] Add Media Search to Media Library

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

- [x] About Manager

- [x] Testimonials Manager

- [x] Contact & Visit Manager

- [x] Opening Hours Manager (day picker, not raw integer input)

- [x] Social Links Manager (platform picker + ordering)

- [x] Navigation Manager (route validation + ordering)

- [x] SEO Manager (per-page fields + OG image selection)

- [x] Site Settings Manager

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

- [x] **A6** Storage read exposure on `chatten-media` — fixed via route proxy.
      `"chatten public read"` was unconditional (`using (bucket_id = 'chatten-media')`).
      Migration `20260921000200_restrict_chatten_media_storage_read.sql` joined it
      to `chatten_cafe.media.rights_status = 'approved'`, but that alone closed
      nothing: the bucket had `public = true`, and self-hosted storage-api serves
      `/storage/v1/object/public/{bucket}/{path}` **without evaluating RLS at all**
      for a public bucket — confirmed by curling an `unknown`-rights object before
      and after the policy change, both `200`.
      Fixed 2026-09-21 with an application route proxy (not signed URLs):
      `app/api/media/[id]/route.ts` looks the media row up with the caller's own
      RLS-bound session client, so visibility is decided by the existing
      `public_media` / `cms_manage` policies — anonymous visitors get approved
      media only, signed-in CMS members can still preview unapproved assets. The
      bytes are then streamed with the service-role client (server-only, reached
      only after the RLS check passed). Unknown ids and rows no policy exposes
      both return `404`, so the route does not confirm whether an asset exists.
      All 9 URL builders now go through `lib/media/url.ts` (`mediaHrefById`) and
      address media by id on this origin: `lib/homepage/media.ts`,
      `lib/public-data/media.ts`, `components/admin/media-picker.tsx`,
      `event-promotion-manager.tsx`, `experience-edit-form.tsx`,
      `experiences-manager-client.tsx`, `gallery-manager-client.tsx`,
      `space-edit-form.tsx`, `spaces-manager-client.tsx`, plus
      `app/admin/(dashboard)/media/page.tsx`. The `baseUrl` prop was dropped from
      every admin page that passed it. `next.config.ts` lost its
      `images.remotePatterns` entry and its CSP `img-src` no longer lists the
      Supabase origin, so re-introducing the bypass would now fail CSP as well.
      Bucket flipped to `public = false` last, only after the route was verified
      (`20260921000400_make_chatten_media_bucket_private.sql`, applied 2026-09-21).
      Post-flip verification: approved media `200` with bytes through the route,
      unapproved `404`, direct `object/public/...` now `400` (an initial `200`
      there was a stale Cloudflare edge entry; a cache-busted request returns
      `400`). CMS upload and delete are unaffected — they match
      `"chatten cms manage"`, which does not depend on `bucket.public`.
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

- [x] **A15** Add a mobile navigation drawer to the CMS. The sidebar is
      `hidden … lg:block` (`app/admin/(dashboard)/layout.tsx:6`) with no hamburger
      control anywhere, so below 1024px there is no way to move between CMS
      sections at all. Highest-impact dashboard fix.
- [x] **A16** Audit and fix admin table/form/toolbar overflow at `sm`/`md`
      (horizontal scroll wrappers, stacking, action buttons reachable on phone).
- [x] **A17** Repoint sidebar "Homepage" from `/admin/hero` to `/admin/homepage`
      (the real section manager, currently unreachable from navigation) and add a
      separate "Hero" entry.
- [x] **A18** Link `/admin/preview` from the sidebar (orphaned route).
- [x] **A19** Fix dashboard overview quick links pointing at the weak generic
      routes (`app/admin/(dashboard)/page.tsx:3,5` → `/admin/menu-items`).
- [x] **A20** Remove or redirect the `menu-categories` / `menu-items` generic
      resource keys (`lib/admin/resources.ts:10-11`), which bypass the dedicated
      manager's delete protection and `parseIdr` price parsing.
- [x] **A21** Add `loading.tsx` to admin route segments (none exist today).
- [x] **A22** Add success feedback. Four or more actions redirect with `?saved=1`
      but no page reads it, so saves complete with no confirmation.
- [x] **A23** Add submit-pending state to admin forms still using plain
      `<form action={…}>` without `useFormStatus`/`useActionState`.
- [x] **A24** Surface `error.message` in `app/admin/(dashboard)/error.tsx`;
      validation messages like "Event end must be after its start." are currently
      replaced by one generic sentence.
- [x] **A25** Build a real dashboard overview: draft counts across all
      status-bearing tables (only `hero_slides` is checked today), recent activity
      from `updated_at`, publish status, and correct quick actions.
- [x] **A26** Add drag ordering to generic-route resources by wiring the existing
      but entirely unused `reorderResource` (`lib/admin/actions.ts:9`) to
      `SortableList`; ordering is currently raw `sort_order` number entry.
- [x] **A27** Add search/filter/pagination to list views (only Media Library has them).
- [x] **A28** Expose DB fields that have no UI: `contact_information.email`,
      `seo_settings.og_media_id` (OG image is unmanageable today),
      `media.focal_x`/`focal_y`.
- [x] **A29** Style `app/admin/(dashboard)/media/items/[id]/page.tsx` — the form
      has no Tailwind classes at all, unlike every other edit screen.
- [x] **A30** Preserve the requested path across login redirects
      (`lib/auth/require-admin.ts:3` drops it, always landing on `/admin`).
- [x] **A31** Add unsaved-changes warning to long-form admin editors.

## Phase 10 — Public Site UX, Content Sync & SEO

- [x] **A32** Wire `seo_settings` into `lib/seo.ts` / `generateMetadata`. The CMS
      SEO editor is currently disconnected from the live site entirely.
- [x] **A33** Resolve `navigation_items` and `social_links` centrally in
      `PublicShell`. Today only the homepage passes them, so every other page
      falls back to hardcoded links (`components/public/header.tsx:5`) and drops
      CMS social links — a direct violation of the CMS-managed content rule.
- [x] **A34** Add `/about` and `/events` to navigation and footer; both are
      working content pages currently unreachable from any link.
- [x] **A35** Replace the homepage's hand-rolled `<footer>`
      (`app/(public)/page.tsx:34`) with `PublicFooter`, restoring internal links
      on the highest-traffic page.
- [x] **A36** Fix homepage landmarks: move `Header`/footer out of `<main>` so
      `banner` and `contentinfo` roles survive for screen readers.
- [x] **A37** Add `generateMetadata` to `events/[slug]`, `experience/[slug]`,
      `spaces/[slug]`; all detail pages currently share one generic title.
- [x] **A38** Render a hero image on Experience and Space detail pages — the list
      cards show imagery, the detail pages show none.
- [x] **A39** Add `app/error.tsx` for the public tree and wrap the unguarded
      query helpers in `lib/public-data/queries.ts` like `getHomepageData` already does.
- [x] **A40** Fix kicker contrast: `text-[#b26043]` on `#f4eedf` is ≈3.9:1,
      below the 4.5:1 AA threshold, and appears on nearly every page.
- [x] **A41** Re-check `text-[#6c715d]` / `text-[#5b6254]` body and empty-state
      greys against AA.
- [x] **A42** Migrate background-image rendering to `next/image` with `sizes`
      (hero, moments, cards, gallery, menu). Only Events uses it today; mobile
      currently downloads desktop-resolution originals throughout.
- [x] **A43** Make hero heights mobile-first (`min-h-[760px]` and
      `py-36 sm:py-44` never shrink below the `sm` breakpoint).
- [x] **A44** Enlarge the mobile menu button to a ≥44px touch target
      (`components/public/header.tsx:5`).
- [x] **A45** Add `loading.tsx` to public routes (all are `force-dynamic`).
- [x] **A46** Emit `LocalBusiness`/`Restaurant` JSON-LD from CMS contact/hours
      data; only a generic `WebSite` object is emitted today.
- [x] **A47** Fail the production build (or warn loudly) when
      `NEXT_PUBLIC_APP_URL` is unset — it silently yields no canonical URLs, no OG
      tags, and an empty `sitemap.xml`.
- [x] **A48** Add a skip-to-content link and `aria-current="page"` on active nav links.
- [x] **A49** Reuse `components/ui/button.tsx` for public CTAs instead of
      hand-copied Tailwind (currently imported by no public page).

## Phase 11 — Database Integrity & Type Safety

- [x] **A50** Add the missing `media` foreign keys. `image_media_id` on
      `hero_slides`, `moments`, `about_sections`, `experiences`, `spaces`,
      `menu_items`, `gallery_items` and `seo_settings.og_media_id` are bare `uuid`
      columns with no FK; referential integrity is app-layer only.
- [x] **A51** Repair `20260909000600_add_event_promotion_media.sql`, which is a
      silent no-op: `add column if not exists` skips the whole clause (including
      `references`) because the column already existed, so `events`/`promotions`
      never got their FK.
- [x] **A52** Replace the placeholder `types/database.ts`
      (`Record<string, unknown>` for every table) with generated types, and add a
      CI check. This is the root cause that let A1 ship undetected.
- [x] **A53** Add `alter default privileges` for `anon`/`authenticated` so new
      tables are not silently unreadable (only `service_role` has defaults today).
- [x] **A54** Add `force row level security` on `chatten_cafe` tables.
- [x] **A55** Add `own_profile_insert` policy to `profiles` (INSERT currently
      works only because the `handle_new_user` trigger is `SECURITY DEFINER`).
- [x] **A56** Add index on `menu_items.category_id` (FK filtered on every
      reorder, insert, and delete guard).
- [x] **A57** Push `is_active`/`status` filtering into public queries instead of
      filtering in JS (`about_sections` is never filtered at all).
- [x] **A58** Batch reorder writes; every reorder action issues one UPDATE per
      row, several doing a two-pass staging round trip.
- [x] **A59** Replace per-row `auth.admin.getUserById` in
      `app/admin/(dashboard)/users/page.tsx:5` with a single `listUsers()`.
- [x] **A60** Look up public detail pages by `.eq("slug", …)` instead of fetching
      the whole collection and `Array.find`.
- [x] **A61** Adopt shared Zod schemas across server actions. Zod is currently
      used only for env parsing; `status` is unchecked in several actions, UUIDs
      are checked inconsistently, and `Number(input)` has no `NaN` guard.
- [x] **A62** Drop the dead `contact_information.map_url` column.
- [x] **A63** Add `opening_hours` consistency CHECK (`is_closed` vs
      `opens_at`/`closes_at`, and `closes_at > opens_at`).
- [x] **A64** Add partial indexes for the public `is_active AND status` filters.
- [x] **A65** Document the `prevent_last_super_admin_removal` cascade behaviour:
      deleting the last super_admin's auth user fails the whole cascade with a raw
      trigger exception.
- [~] **A66** Void — superseded by A67. This asked an operator to approve the
      3 `rights_status = 'unknown'` rows in `chatten_cafe.media` so the pickers
      would stop rendering empty. A67 removed the gate instead, so there is
      nothing left to approve. The pickers were fixed by that change; what is
      still outstanding is the *content* task above — there are only 3 images
      in the library and every content row still has `image_media_id IS NULL`.
- [x] **A67** Remove the media rights-approval gate
      (`20260921000500_remove_media_rights_approval.sql`). The gate was four
      layers deep: an `.eq("rights_status","approved")` filter on every public
      query and every picker query, the `public_media` RLS predicate, a
      `storage.objects` predicate joining back to `chatten_cafe.media`, and six
      server actions that refused to save a row pointing at an unapproved
      image. The premise was a shared photo library where provenance must be
      cleared before publication; Chatten is a single-cafe landing page edited
      by the people who took the photos, so the gate only ever stood between an
      operator and the image they had just uploaded — with nothing on screen
      explaining why it would not appear.

      Alt text became optional in the same pass (`gallery_items.alt_text` is
      now nullable); a blank falls back to the row's title, so it adds SEO
      value when filled and blocks nothing when not. The Media Library's rights
      filter, its "Rights:" tile line, the rights/provenance fieldset and the
      dashboard's "Awaiting rights approval" tile all went with it — the tile
      was replaced with "Unused images", which counts library images no content
      row points at and is the metric that actually explains an empty section.

      **Not removed:** the `chatten-media` bucket stays private
      (`public = f`) and bytes still go through `app/api/media/[id]`, so
      storage paths remain unguessable. That layer costs the operator nothing —
      no step, no field, no button. `tests/media-approval-removed.test.mjs`
      scans the whole source tree for any returning `rights_status` reference
      and asserts the bucket flip in `…000400` is still in place, so neither
      half can be undone silently.

## Phase 7 — Layout, Responsiveness & UI/UX Audit

Full findings, with measurements and contrast ratios, live in
[`docs/AUDIT_UI_RESPONSIVE.md`](AUDIT_UI_RESPONSIVE.md). This list tracks the
work items; the audit document holds the evidence.

- [x] **A68** Fix the cascade-layer bug that discarded every colour utility on
      every link. `app/globals.css` reset anchors with an *unlayered*
      `a { color: inherit; text-decoration: none; }`. Tailwind v4 places all
      utilities inside `@layer utilities`, and unlayered CSS outranks every
      cascade layer regardless of specificity — so a bare element selector beat
      `.text-white` on every `<a>`/`<Link>` in the repo while leaving
      `<button>` untouched. That asymmetry is exactly what the operator saw:
      "Save changes" (a `<button>`) readable, "Get Directions" (an `<a>`)
      dark-on-dark at 1.05:1.

      Moving the identical rule inside `@layer base` fixes it repo-wide in one
      line. Browser-verified on `/`: `Get Directions` went 1.05:1 → 13.31:1,
      `Explore Chatten` 2.2:1 → 5.91:1, anchors below AA on the page 2 → 0.
      The default `solid` CtaLink variant, the `outline` hover state, the skip
      link's focus state and seven admin anchors all recovered with it.

      `tests/anchor-cascade.test.mjs` reads `app/globals.css`, rejects an
      unlayered `a { color: … }` and any other unlayered element rule setting
      `color`. Verified by mutation: re-adding the unlayered rule fails the
      test with the right message.

- [x] **A69** Change `lg:` to `xl:` on three admin grids. At exactly 1024px the
      content box is `1024 − 256 (lg:pl-64) − 64 (lg:p-8) = 704px`, yet
      `menu-manager-client.tsx`, `space-edit-form.tsx:24` and
      `experience-edit-form.tsx:65` all added a 22rem column at `lg:` — leaving
      the *primary* column at 320–328px, narrower than the image aside beside
      it, from 1024px to 1279px. `[resource]/page.tsx:156` already did this
      correctly with `xl:`; the three files copied the pattern and got the
      breakpoint wrong.
      **Done.** All three moved to `xl:`. `media/page.tsx` also had its fixed
      `22rem` track changed to `minmax(0,22rem)` (a bare `22rem` track cannot
      shrink, so a wide child pushes the grid past its container) and its
      `lg:grid-cols-3` to `xl:grid-cols-3`; `preview/page.tsx` gained an
      `sm:grid-cols-2` step so it is not a single column all the way to `xl`.
      Verified in the browser at 1024×800: the menu primary column now resolves
      to **689px** (was 328px), and the MediaPicker embedded in it reflows from
      ~100px thumbnails to **193px** — the knock-on fix this item predicted.

- [x] **A70** Give the menu category popover a positioned ancestor. The
      `absolute z-20 mt-2 w-72` edit form in `menu-manager-client.tsx` had no
      positioned ancestor anywhere up to `layout.tsx` — `sortable-list.tsx:11`
      only applies `relative` while a row is being dragged. The popover
      resolved against the initial containing block and rendered detached from
      its trigger at every viewport width. The only defect that was broken at
      all widths.
      **Done.** `<details>` → `<details className="relative">`. The row was
      deliberately *not* made permanently `relative`: its `relative z-10` while
      dragging exists so the dragged row paints above its neighbours, and a
      permanent `relative` would make that `z-10` compete with static siblings.
      Verified in the browser: the popover's `offsetParent` is now
      `DETAILS.relative`, at `dx: 0, dy: 8` from its trigger (the `mt-2`).
      Guarded by `tests/absolute-positioning.test.mjs`, which asserts both the
      `relative` and that the drag-only `z-10` survived. Mutation-verified.

- [x] **A71** Raise touch targets to 44px. `px-2 py-1 text-xs` was the house
      style for every row action across all six admin managers and yields
      ~24px — 45% under the minimum. `sortable-list.tsx:12`'s drag handle had
      zero vertical padding. On the public side `cta.tsx:15` already carried
      `min-h-11`, so every failure there was a raw anchor bypassing the
      component: three underlined links on the homepage (25px), the header and
      footer logos (32/35px) and eight footer links (20px, separated by only
      12px of `gap-y-3`).
      **Done.** The fix was to name the pattern once rather than retype a
      height 30 times: `components/ui/control.ts` now exports `ROW_ACTION`
      (+ `_BORDERED`/`_DANGER`/`_PRIMARY`), `TEXT_LINK`, `TEXT_LINK_ON_DARK`
      and `TAP_TARGET`, all built on `min-h-11` (2.75rem = 44px exactly) with
      `inline-flex items-center` so the label stays centred — the target grows,
      the ink does not. Admin actions were mapped **by what the handler does**,
      not by their old colour: anything calling a `delete*` action became
      `ROW_ACTION_DANGER`, the one navigating action per row became
      `ROW_ACTION_PRIMARY`, reversible toggles became `ROW_ACTION_BORDERED`.
      `sortable-list.tsx` keeps `touch-none` on the drag handle — the dnd-kit
      `TouchSensor` stops working without it.
      Public: the three homepage anchors → `TEXT_LINK`; both logos and the
      header/footer nav links → `TAP_TARGET`. The footer's `gap-y-3` dropped to
      `gap-y-1`: 12px of gap was compensating for 20px boxes, but a 44px box
      with 20px of ink already puts ~24px of empty space between stacked
      labels, so keeping both would have inflated the mobile footer for no
      gain. `gap-x-5` unchanged — horizontal neighbours are label-width and
      still need real separation.
      Guarded by `tests/touch-target.test.mjs`, which scans the source tree for
      the raw string rather than asserting about any one file, because the
      defect was never in one file — it was a convention. Mutation-verified.
      **Not changed, deliberately:** the `<span>Explore experience</span>` in
      `app/experience/page.tsx` carries the underline style but is *not* a
      target — the whole card is one ~350px-tall `<a>`. Giving it `TEXT_LINK`
      would nest a second focus ring inside a single link. The test was
      narrowed to match `<a>`/`<Link>` tags rather than className alone so it
      stops reporting it.

- [x] **A72** Add `flex-wrap` to the admin rows and the public gallery
      header. Each admin row paired a checkbox label with a Status `<select>`,
      or a `px-6 py-3` Save with a `px-6 py-3` Cancel; both overflowed 375px.
      `app/(public)/page.tsx:36` (gallery header) was missing the `flex-wrap`
      its sibling on line 32 has.
      **Done** in `space-edit-form.tsx`, `experience-edit-form.tsx`,
      `experiences-manager-client.tsx`, `event-promotion-manager.tsx` and the
      gallery header. The event/promotion card title also picked up `truncate`,
      and `[resource]/page.tsx:160`'s `<summary>` `break-words` — a long
      untruncated title was the thing actually forcing those rows wide.

- [x] **A73** Bring the hero down to phone height. `min-h-[760px]` measures
      1.14× an iPhone SE viewport, so nothing below the hero was reachable
      without scrolling and `items-end` put the h1 at `top: 352px`. `pt-44`
      (176px) had no mobile step-down. The `min-h-[560px]` + `min-h-[430px]`
      pair on the feature band stacked the same way. The h1 itself does **not**
      clip — measured `scrollWidth` 327 against `clientWidth` 327 at 375px, so
      that earlier claim is withdrawn.
      **Done.** Hero → `min-h-[70svh] sm:min-h-[760px]` and `pt-28 sm:pt-44`.
      `svh` rather than `vh` so the mobile browser toolbar shrinking does not
      leave the section taller than the visible viewport. Feature band →
      `min-h-[380px] sm:min-h-[480px] lg:min-h-[560px]`, and its inner column
      to `min-h-0 sm:min-h-[350px] lg:min-h-[430px]`: the two minimums stack,
      so any non-zero inner base is pure dead space on a phone — the content
      plus `p-8` already fills the 380px outer. Font sizes untouched.

- [x] **A74** Consolidate the palette. `--forest`, `--olive`, `--terracotta`
      and `--sand` in `globals.css` are referenced nowhere in `app/` or
      `components/`; every surface hardcodes a near-miss hex instead
      (`#1f3426` vs `--forest: #254632`). That is why the colours read as
      inconsistent — there is no single source of truth. `#768075` fails AA
      wherever it is body text (3.23–4.11:1) and `--terracotta: #b75e42` works
      neither under white text (4.47:1) nor as text on cream (4.04:1); both
      need darkening before the variables are adopted.
      **Done.** 96 distinct hardcoded hexes are now 30 tokens in a Tailwind v4
      `@theme` block — 66 absorbed. Every `text-[#…]`/`bg-[#…]`/`border-[#…]`
      in `app/` and `components/` was rewritten to the token utility by a
      codemod; a grep of all eight rendered public pages confirms zero
      arbitrary-value colour classes remain.

      Grouping was done by measured CIE Lab ΔE, but **distance alone got it
      wrong twice** and the method had to change, not just the numbers:
      - Clustering by ΔE cannot see *role*. Three peach hexes sitting 15–22
        apart are not three colours; they are one button's fill, hover and
        focus ring, and merging them would flatten the button's states.
        `#fdf4f1` is the destructive-hover tint, not a neutral paper.
      - One ΔE threshold cannot judge four different operations. A **merge**
        must be invisible (ΔE < ~3); a deliberate **AA darkening** is visible
        *by definition*, so scoring it against a merge threshold manufactures
        fake failures; a **role fold** is judged by role; a **focus ring** is
        held to 3:1 by WCAG 1.4.11, not 4.5:1. Splitting the validator into
        `merge`/`darken`/`fold`/`ring` took the report from 5 problems to 0.

      Six deliberate AA darkenings, all measured, not guessed:
      `#768075 → #5c665b`, `#b75e42 → #a04e33`, `#b26043 → #8a3a21`,
      and the media-picker empty state where **both** source colours failed
      badly (3.55:1 and 2.67:1) and collapse to one darkened `--color-bark`.
      Darkening is hue-preserving — L\* walked down with a/b held — so nothing
      shifts warm-to-cool. The Lab b\* axis is why warm cream (`#f4eedf`) is
      **not** merged into cool near-white (`#f7f5f0`) despite the small ΔE.

      One thing measured and then deliberately **not** changed: the hero scrim
      `#122117` is ΔE 2.9 from `--color-forest-deep`, close enough to merge on
      distance — but the swap makes white-text contrast *worse* (3.96 → 3.81),
      so it stays. Recorded as a decision, not an oversight.

      Guarded by `tests/palette.test.mjs` (4 tests). It re-implements the WCAG
      and CIE maths rather than importing the app's helpers — a test that
      imported the implementation's own contrast function would still pass if
      that function were wrong. Its first run **failed correctly**, catching
      `--color-bark` referenced but never declared.

      Verified in the browser, not just at build time: A68 was exactly the
      failure where class names are present in the HTML and no CSS rule
      matches. `getComputedStyle` on a live `.text-ink` paragraph returns
      `rgb(77, 86, 73)` = `#4d5649`, and `bg-forest`, `bg-cream`, `bg-sand`,
      `border-line` and `text-rust` all resolve to their declared values.

- [x] **A75** Make `focus-visible` the standard. `cta.tsx:15` was the only
      file in the repo using `focus-visible:ring`. `header.tsx:23,25` stripped
      the native outline unconditionally and replaced it with a `focus:ring`
      that has no offset, over a transparent header on a photo. The skip link's
      destination (`public-shell.tsx:30`) removed its outline with no
      replacement, so a keyboard jump gave no visual confirmation.
      **Done.** `FOCUS_RING` in `components/ui/control.ts` is now the one
      definition; `focus:outline-none` is only ever written together with a
      `focus-visible` ring, so a mouse click no longer draws one. `header.tsx`
      uses a file-local `HEADER_FOCUS` that reuses the existing `#efb38f` and
      the header's own `#1c3025` as the offset colour — no new palette entry.
      The skip target uses `ring-inset`: that div is the full page width, so an
      outset ring would paint 2px past the left and right viewport edges and
      raise a horizontal scrollbar.
      Guarded by the fourth test in `tests/touch-target.test.mjs`: any file
      containing `focus:outline-none` must also contain `focus-visible:ring`.
      **Known gap:** the experience card anchor in `app/experience/page.tsx`
      has no `focus-visible` treatment — it does not strip its outline, so it
      still gets the browser default and is not a regression, but it is the one
      public link surface not yet on this standard.

- [x] **A76** Label the Users form fields. `users/page.tsx` asked for a raw
      UUID with no `<label>` at all and no hint where to obtain it; the
      placeholder was the only label and disappeared on input. The adjacent
      email field was labelled "verify identity" but is not `required` and is
      never used for lookup.
      **Done.** Real `<label>` elements for user_id, email and role, following
      the wrapping-label pattern `spaces-manager-client.tsx:92-97` already
      used, each with a `text-xs` hint below the field name. The UUID hint
      names where to get it: "Copy this from the Supabase Auth dashboard under
      Authentication / Users." The grid also went `md:grid-cols-4` →
      `sm:grid-cols-2 xl:grid-cols-4` (four columns at `md` gave each field
      ~160px, too narrow for a 36-character UUID), the email cell gained
      `break-words`, and the submit button `h-fit self-end` so it aligns with
      the inputs rather than stretching to the tallest label.
      Verified in the browser at 1024px: grid resolves to two columns, all
      three labels present and associated, hint text rendering.

- [x] **A77** Rewrite operator-facing error and empty-state copy. Several
      messages state internal state rather than an action ("No order
      supplied.", "Invalid Gallery order."), and `event-actions.ts:13` throws
      into an error boundary that replaces the whole page, discarding typed
      form values. `login-form.tsx:33` offers no recovery path and cannot
      distinguish a wrong password from a valid Supabase account with no
      `user_roles` row. Still open: this one rewrites operator-facing text, so
      it waits for the owner's wording.
      The dead `empty` prop on `experiences-manager-client.tsx:176` — line 161
      already branched on the empty case — was removed alongside A71/A72, since
      that file was being edited anyway and the prop was unambiguously unused.
      **Done.** The login form held a real defect, not just bad wording:
      `requireAdmin` redirects to `/admin/login?error=unauthorized` when the
      password is *accepted* but the account has no `user_roles` row — and the
      form never read that parameter. The operator saw a blank login screen and
      could only retry a password that had already worked. `initialError()` now
      reads it, and the two states get different words because they need
      different actions: "check what you typed" versus "your credentials are
      fine, ask an administrator for access".

      Sign-in failure is now "That email and password did not match. Check both
      and try again." It stays vague on purpose — Supabase returns one message
      for wrong-password and unknown-email deliberately, since distinguishing
      them lets an attacker enumerate accounts — but it names the two things to
      check instead of just "check credentials". A comment records that reason
      so a future reader does not "improve" it into an enumeration oracle.

      Four server-action messages rewritten from internal state to an action:
      `"No order supplied."` → "The new order was not received. Reload the page
      and try reordering again."; `"Invalid content request"` → "This item could
      not be identified. Reload the page and try again."; and the two Gallery
      equivalents, where "One of the reordered Gallery items no longer exists"
      says what actually happened rather than "Unknown Gallery item."

      `media-upload-dropzone.tsx` claimed "New uploads default to Needs
      Review." — true until A67 removed the gate, and a promise the system no
      longer keeps: `processMediaUploadFile` returns status `uploaded` and the
      image is usable at once. `needs_review` now appears nowhere else in the
      codebase. Replaced with what the system does do.

      **Open question, answered conservatively:** the dashboard copy stays in
      English. Mixing languages mid-interface is worse than either choice, and
      switching the whole CMS to Indonesian is the owner's call, not a
      side-effect of a copy pass. Flag if Indonesian is wanted.

- [x] **A78** Reconcile the two upload limits.
      `media-upload-dropzone.tsx:106` shows `MAX_MEDIA_SELECTION_FILES` while
      `upload-core.ts:118` enforces `MAX_MEDIA_UPLOAD_FILES` — two constants
      for one limit, so the helper text is wrong the moment they diverge. Also
      verify whether "New uploads default to Needs Review" still means
      anything after A67 removed the approval gate, given that the gallery and
      menu managers both submit `status="published"` regardless.
      **Done.** The obvious fix — have one constant import the other — does not
      work here, and finding out why was the substance of the task:
      `upload-core.ts` imports `node:crypto`, so a client component cannot pull
      from it, and `media-upload-dropzone.tsx` is `"use client"`, so the server
      cannot pull from it either. Hence a third, dependency-free module,
      `lib/media/upload-limits.ts`, that both sides import.

      The same latent split existed in the **byte** limit and was not in the
      original finding: `upload-core.ts` enforced `10 * 1024 * 1024` while the
      dropzone hardcoded the string "10 MB". `formatMediaSizeLimit()` now
      derives the words from the enforced number, so the copy cannot drift.

      Guarded by two tests that assert the two limits are the **same value**,
      not that both are 20 — writing "both are 20" would re-create by hand the
      exact coupling being removed. Nothing was visibly broken before this, and
      nothing would have been until someone changed one number, at which point
      the dropzone would accept a selection the server then rejected, after the
      operator had already chosen the files.

      **Open question, answered conservatively:** the limit stays at 20 files.
      Raising it is a server-capacity decision, not a copy fix.

- [x] **A79** Perbaiki pengurutan homepage yang selalu gagal dan rollback yang usang.
      Indeks unik langsung pada `homepage_sections.sort_order` memeriksa setiap
      baris ketika `reorder_rows` menukar peringkat. Permutasi valid pun memicu
      `23505`; bukti browser menunjukkan tombol simpan mengembalikan urutan dan
      tombol pindah langsung menghasilkan HTTP 500. Migration
      `20260926000100_homepage_order_deferrable.sql` menggantinya dengan
      constraint unik `DEFERRABLE INITIALLY DEFERRED`, sehingga keunikan tetap
      wajib pada akhir transaksi tetapi tidak gagal pada keadaan sementara.
      Fungsi database dan allowlist TypeScript juga tidak lagi menerima
      `events` atau `promotions`, karena kolom `sort_order` keduanya telah
      dihapus. CMS menghapus jalur swap dua-update, hanya menyimpan daftar
      lengkap melalui RPC atomik, memvalidasi seluruh set bagian, dan
      `SortableList` memulihkan baseline terakhir yang benar-benar tersimpan.
      Kontrak pengujian: `node --test tests/reorder-core.test.mjs` (17 lulus).
      Diterapkan pada Supabase self-hosted 2026-09-26 melalui `psql` terhadap
      service `db` dalam satu transaksi `ON_ERROR_STOP`: constraint terverifikasi
      `condeferrable=true` dan `condeferred=true`, fungsi tetap
      `SECURITY INVOKER`, dan hak `EXECUTE` hanya untuk `authenticated`.
      Uji DB langsung membalik seluruh 10 bagian di dalam transaksi lalu
      `ROLLBACK`: RPC memperbarui 10 baris, hasilnya tetap 10 peringkat unik
      `0..9`, dan urutan asli terkonfirmasi pulih setelah rollback.

- [x] **A80** Pertahankan status kotor sampai server mengonfirmasi simpan berhasil.
      `UnsavedChangesGuard` kini membandingkan snapshot baseline server dengan
      nilai layar; submit hanya mencatat nilai yang dikirim, gagal tidak
      menggeser baseline, dan ketikan saat request berjalan tetap dianggap belum
      tersimpan. Peringatan juga tetap aktif selama fase simpan.

      Penjaga saja tidak cukup: `<form action={serverAction}>` melempar
      kegagalan validasi/PostgREST ke error boundary yang melepas seluruh
      formulir, sehingga tidak ada penjaga tersisa untuk memperingatkan.
      `components/admin/action-form.tsx` menahan kegagalan biasa lewat
      `useActionState`, meneruskan status sebenarnya ke penjaga, dan menampilkan
      pesan `role="alert"`; `NEXT_REDIRECT` sengaja dilempar ulang agar simpan
      yang `redirect("?saved=1")` tetap bekerja. Keenam formulir bergaransi kini
      memakainya. Kontrak: 32 tes terfokus, diverifikasi lewat mutasi.

- [x] **A82** Perbaiki hydration mismatch drag-and-drop dan luapan Pustaka Media.
      `DndContext` tanpa prop `id` mengambil id dari penghitung modul global,
      yang dimulai pada nilai berbeda di server dan di browser. Setiap tombol
      seret karena itu dirender `aria-describedby="DndDescribedBy-0"` di server
      dan `"DndDescribedBy-73"` di klien; React melaporkannya sebagai hydration
      mismatch dan menolak menambal atribut tersebut, sehingga deskripsi
      drag-and-drop menunjuk ke elemen yang tidak ada bagi pembaca layar.
      `components/admin/sortable-list.tsx` kini memakai `useId()`, satu-satunya
      pemakaian `DndContext` di repo, sehingga `/admin/homepage`, `/admin/menu`,
      `/admin/spaces`, dan `/admin/experiences` tertutup sekaligus.

      Luapan horizontal `/admin/media` pada 375px (`scrollWidth` 384 lawan
      `clientWidth` 375) ternyata bukan kegagalan `truncate`. Grid item bawaan
      memiliki `min-width: auto`, jadi `<article>` pembungkus kartu ikut
      memaksakan min-content judulnya — diukur ~322px lewat probe
      `width: min-content`. `min-w-0` pada kartu membuat `truncate` berlaku.

      Bukti sesudah perbaikan: sapuan Playwright terautentikasi atas 22 rute
      pada 375/768/1440 melaporkan `findings: []` dan `failures: []` — tanpa
      luapan, peringatan hydration, galat konsol, maupun request gagal.

- [x] **A83** Perketat tujuh server action editor domain (`menu`, `gallery`,
      `events`, `promotions`, `spaces`, `experiences`, dan `roles`) dengan
      skema bersama `form-schema.ts`. Semua ID kini UUID ketat, status dan
      toggle tervalidasi, kolom wajib serta rentang waktu diperiksa sebelum
      PostgREST, dan setiap lookup gagal dihentikan. Mutasi update/delete/upsert
      yang sensitif terhadap RLS meminta `count: "exact"` lalu menolak hasil
      selain satu baris, sehingga filter RLS tidak lagi terlihat sebagai simpan
      sukses. Pengujian unit skema dan kontrak sumber menutup parser, lookup,
      pengurutan, serta exact-row check tanpa database remote.

- [x] **A84** Terjemahkan antarmuka CMS ke bahasa Indonesia. A77 menyisakan
      pertanyaan terbuka: salinan dasbor tetap bahasa Inggris sampai pemilik
      memutuskan. Keputusannya diambil — seluruh permukaan administrator kini
      berbahasa Indonesia, sejajar dengan situs publik. Operator tidak lagi
      menerjemahkan sendiri kalimat seperti "Delete this record?" sebelum
      menekan tombol yang tidak bisa dibatalkan.
      Cakupan: shell dasbor dan navigasi, ringkasan beranda CMS termasuk waktu
      relatif (`baru saja`, `3 jam lalu`, `toLocaleDateString("id-ID")`),
      editor resource generik, batas galat, layar muat, akun, pengguna & peran,
      pratinjau, beranda, formulir edit galeri dan menu, layar masuk,
      `DeleteButton`/`SubmitButton`/`SavedNotice`/`ResourceReorder`, pengelola
      menu, galeri, ruang, pengalaman, acara, dan promosi, serta label pada
      `lib/admin/resources.ts`, `field-options.ts`, `overview-tables.ts`, dan
      `unsaved-changes.ts`.
      Yang **tidak** ikut diterjemahkan, dan alasannya: nilai kolom `draft` dan
      `published` yang difilter query publik, nama peran `editor`/`admin`/
      `super_admin`, kunci resource dan seluruh path rute, `sort_order` dan
      `created_at`, kunci `?error=`, nama platform sosial (merek), serta
      pencocokan `"an error occurred in the server components render"` pada
      `error.tsx` — itu pesan React sendiri, menerjemahkannya membuat setiap
      galat server menampilkan digest mentah. `lib/admin/*` aksi server dan
      seluruh alur unggah media dikerjakan agen lain dan sengaja dilewati.
      Kontrak pengujian: `tests/admin-copy-indonesian.test.mjs` (11 kasus)
      memeriksa frasa Indonesia ada **dan** frasa Inggris lama tidak kembali,
      mengikuti pola uji navigasi A15. Empat berkas uji lama yang terikat
      literal diselaraskan: `field-options`, `unsaved-changes`,
      `events-promotions-manager-core`, dan `admin-overview`. Verifikasi akhir
      menutup lint tanpa galat setelah penyelarasan `SortableList` A79.

- [x] **A85** Terjemahkan lapisan bersama yang terlewat A84, dan kunci dengan
      kontrak. A84 menutup layar yang diklik operator, tetapi setiap pesan yang
      benar-benar dibaca ketika simpan **gagal** berasal dari lapisan di
      bawahnya — dan lapisan itu masih berbahasa Inggris. Akibatnya simpan
      berhasil berbahasa Indonesia sementara simpan gagal berbahasa Inggris,
      persis pada momen operator paling butuh mengerti.
      Cakupan: pesan cadangan `ActionForm` (`Penyimpanan gagal. Perubahan Anda
      masih ada. Periksa formulir lalu coba lagi.`), validasi dan penyimpanan
      urutan (`reorder-core.ts`, `reorder.ts`, kini berlabel per modul sehingga
      editor tahu daftar mana yang gagal), aksi resource generik
      (`lib/admin/actions.ts`), simpan detail media dan validasi titik fokus,
      kontrol hapus media beserta daftar penggunaannya, label sumber
      `lib/media/usage.ts`, serta nilai mentah `draft`/`published` dan
      `super_admin`/`admin`/`editor` yang sebelumnya tercetak apa adanya di
      `/admin/preview` dan `/admin/users`.
      Kata benda domain diseragamkan lintas modul: `experience` → `pengalaman`,
      `space` → `ruang`, `Gallery` → `galeri`, `event` → `acara`,
      `Media Library` → `Pustaka Media`, `homepage` → `beranda`.
      Yang **tidak** diterjemahkan, dan alasannya sama seperti A84: nilai yang
      disimpan di basis data tetap Inggris — `<option value="draft">` dan
      `value="published"` tidak bergeser, kunci peran tetap kunci peran, kunci
      map pada `usage.ts` tetap kontrak yang dibaca setiap konsumen, dan
      pencocokan `^an error occurred in the server components render` pada
      `action-form.tsx` tetap Inggris karena itu teks redaksi Next.js sendiri.
      Komentar pengembang juga tetap Inggris.
      Lima berkas yang masih terminifikasi jadi satu baris (`media-delete-control.tsx`,
      `preview/page.tsx`, `reorderResource`, `saveMediaDetails`, dan empat
      `lib/admin/*-actions.ts`) ditulis ulang berformat tanpa mengubah logika,
      urutan operasi, maupun semantik penjaga — termasuk urutan hapus metadata
      sebelum Storage pada `deleteMediaWithFeedback`.
      Kontrak pengujian: `tests/admin-copy-indonesian.test.mjs` bertambah 7 kasus
      (11 → 18) yang menutup lapisan bersama, dan menegaskan nilai tersimpan
      tetap Inggris. Empat berkas uji yang terikat literal Inggris diselaraskan:
      `reorder-core`, `media-focal-point`, `media-delete-protection`, dan
      `media-detail-usage`.

- [x] **A86** Selaraskan dokumentasi operator dengan antarmuka yang sudah
      diterjemahkan, dan bukti audit responsif ulang. `docs/CMS_GUIDE.md`
      mengutip label tombol secara verbatim, sehingga penerjemahan A84/A85
      membuat panduan itu menyuruh operator mencari kontrol yang sudah tidak
      ada: "klik **Delete safely**" padahal tombolnya berbunyi **Hapus dengan
      aman**, "**View / Edit** di Media Library" padahal layarnya bernama
      **Pustaka Media**, dan "**Search media...**" padahal kolomnya berbunyi
      **Cari media…**. Panduan diterjemahkan penuh, lalu sepuluh kutipan
      kontrol disesuaikan dengan string sumbernya.
      Tiga pernyataan yang faktualnya salah juga diperbaiki, bukan hanya
      diterjemahkan:
      1. **Kosongkan pilihan** digambarkan dapat memulai kumpulan unggahan baru
         kapan saja; `media-upload-dropzone.tsx` mematikan tombol itu begitu ada
         hasil (`canModifyQueue`) dan mengubah labelnya menjadi **Hasil
         terkunci**. Panduan kini menyatakan batas itu.
      2. `docs/MEDIA_WORKFLOW.md` masih mendokumentasikan gerbang
         `rights_status` (`Set rights_status to approved`, `rights_status:
         unknown`, `approved is required before publishing`), padahal kolomnya
         dihapus oleh `20260921000500_remove_media_rights_approval.sql`.
         Klausa itu dihapus; kelayakan hak pakai dinyatakan sebagai kebijakan
         editorial, bukan penjagaan basis data.
      3. `Media Detail Used In UI remains next step` sudah tidak benar — UI itu
         sudah tayang sebagai heading **Digunakan di**.
      Kontrak pengujian bertambah 2 kasus (18 → 20): satu memasangkan setiap
      label yang dikutip panduan dengan berkas sumber yang merendernya, satu
      lagi menolak kembalinya dokumentasi `rights_status`. Dengan itu,
      menerjemahkan tombol tanpa memperbarui panduan akan menggagalkan uji,
      bukan lolos diam-diam.
      Bukti audit responsif ulang setelah seluruh perubahan A84–A86:
      `.e2e/overflow-audit.mjs` pada 30 rute publik + dasbor di lebar 375, 768,
      dan 1440 melaporkan `findings: []`, `failures: []`, `consoleErrors: []`,
      `failedRequests: []`. Tidak ada luapan horizontal, tidak ada rute 4xx/5xx,
      tidak ada kebocoran redirect login, dan setiap halaman dasbor tetap punya
      `h1`.

- [x] **A87** Tutup eskalasi peran `admin` → `super_admin` pada batas database,
      bukan hanya di aksi CMS. `user_roles.role_manage` adalah satu kebijakan
      permisif `FOR ALL` dengan `has_role('admin')`; karena fungsi itu juga
      bernilai benar untuk `super_admin`, setiap admin dapat memanggil PostgREST
      langsung dan PATCH barisnya sendiri menjadi `super_admin`. `saveRole`
      memang menolak tindakan itu, tetapi aksi server bukan batas keamanan ketika
      token sesi yang sama dapat mengakses `/rest/v1/user_roles`.
      `20260926000200_restrict_super_admin_role_writes.sql` menambah tiga
      kebijakan **restrictive** per perintah: INSERT menguji role baru, UPDATE
      menguji row lama dengan `USING` dan row baru dengan `WITH CHECK`, DELETE
      menguji row lama. Predikatnya sama: `role <> 'super_admin' OR
      has_role('super_admin')`. Bentuk restrictive wajib karena kebijakan
      permisif di-OR; menambah kebijakan permisif tidak akan pernah membatasi
      `role_manage` lama. SELECT sengaja tidak dibatasi, sebab `storedRole()`
      pada `role-actions.ts` perlu melihat target `super_admin` sebelum memberi
      pesan penolakan yang tepat.
      Tidak ada RLS yang dinonaktifkan, grant yang diperlebar, maupun perubahan
      pada `protect_last_super_admin`: trigger itu tetap menjawab pertanyaan
      berbeda, yaitu larangan menghapus/demosi super admin terakhir.
      Kontrak statis baru `tests/role-escalation-guard.test.mjs` (7 kasus)
      mengunci tiga kebijakan restrictive, predikat pre-/post-image UPDATE,
      ketiadaan perubahan SELECT/grant/RLS, serta pesan aksi server.
      Dibuktikan langsung terhadap Supabase self-hosted pada 2026-09-26 dengan
      empat akun Auth sementara dan pembersihan `finally`: matriks RLS 28/28
      lulus. Admin ditolak saat promosi diri maupun saat INSERT super admin,
      DELETE role super admin ditolak, sedangkan super admin masih dapat
      memberi dan menurunkan role super admin. Metadata `pg_policies`
      mengonfirmasi tiga guard `RESTRICTIVE` dan `role_manage`/`own_role` tetap
      ada. Script audit sementara juga diperbaiki: RPC `reorder_rows` hasil
      `0` diklasifikasikan sebagai penolakan RLS, kolom SEO dipakai `title`
      (bukan `meta_title` yang tidak ada), dan akun tanpa role tetap diberi
      profile agar fixture memenuhi foreign key.

- [x] **A88** Selaraskan kontrol Pengguna & Peran dengan batas A87,
      supaya UI tidak menawarkan aksi yang pasti ditolak server atau database.
      Halaman kini memakai `cmsRole` hasil `requireAdmin("admin")` (klien sesi
      terikat RLS), bukan data service-role, untuk menentukan kemampuan caller.
      Bagi Admin, formulir tambah pengguna dinonaktifkan, semua opsi Super admin
      terkunci, baris Super admin yang sudah ada tetap menampilkan nilai terpilih
      tetapi seluruh aksi ubah/hapus terkunci, dan tombol hapus role milik sendiri
      juga terkunci. Bagi Super admin, tambah pengguna dan pengelolaan role lain
      tetap aktif, sedangkan ubah/hapus role diri sendiri terkunci sesuai guard
      server. Menonaktifkan, bukan menghilangkan, opsi Super admin mencegah baris
      yang sudah ada jatuh tampil sebagai Editor. Pesan ringkas menjelaskan bahwa
      Admin tetap dapat mengatur Editor/Admin yang sudah ada; hanya Super admin
      dapat menambah anggota atau mengelola Super admin. Panduan operator pada
      `docs/CMS_GUIDE.md` memuat matriks hak dan perlindungan super admin terakhir.
      Kontrak `tests/role-escalation-guard.test.mjs` kini 8 kasus dan menyematkan
      seluruh kondisi UI itu. Dibuktikan di browser pada 2026-09-26 dengan akun
      Admin dan Super admin sementara lalu keduanya dihapus: cabang Admin dan
      Super admin menunjukkan state kontrol yang tepat, tanpa error console atau
      server. Verifikasi akhir: 368/368 uji, lint, typecheck, dan build lulus.

- [x] **A89** Keras-kan batas service-role Media Library tanpa mengubah bucket
      privat atau kebijakan RLS. `app/api/media/[id]` kini hanya meneruskan
      `chatten-media` konstan ke Storage; `bucket`, `storage_path`, dan
      `mime_type` dari baris database diperlakukan sebagai data tidak tepercaya.
      Helper murni baru menolak bucket asing, path traversal, path absolut,
      pemisah kosong, dan karakter bermakna URL seperti `#`/`?` yang sebelumnya
      dapat memotong URL Storage lalu mengalias objek lain. Hanya JPEG, PNG,
      WebP, dan AVIF tervalidasi yang dikirim `inline`; nilai MIME lain turun
      menjadi `application/octet-stream` sebagai `attachment`, tetap dengan
      `X-Content-Type-Options: nosniff`. Upload, kompensasi upload, dan delete
      memakai konstan bucket yang sama. Delete metadata dengan bucket asing
      tidak pernah mengarahkan service role ke bucket itu; metadata dihapus dan
      operator menerima laporan berkas yatim yang perlu diperiksa. Simpan detail
      media juga kini mensyaratkan tepat satu baris berubah agar RLS atau race
      tidak terlihat sebagai simpan berhasil.

      Diverifikasi 2026-09-26 dengan fixture audit `zzz-audit-*` sementara dan
      pembersihan terverifikasi: bucket asing serta path traversal memberi 404,
      metadata `text/html` pada objek PNG nyata memberi 200 dengan
      `application/octet-stream; attachment; nosniff`, dan PNG valid tetap 200
      `image/png; inline`. Audit menemukan alias fragment (`#`) pada URL Storage;
      gate allowlist diperketat lalu seluruh path media nyata diperiksa sudah
      kompatibel. Kontrak baru mencakup bucket, path, URL-alias, MIME, proxy,
      mutasi bucket tetap, dan affected-row update. Verifikasi akhir: 374/374
      uji, lint, typecheck, build, serta proxy PNG nyata lulus.
      Batas ini adalah lapisan aplikasi saja. Kebijakan `storage.objects`
      anonim historis pada `20260921000500_remove_media_rights_approval.sql`
      belum dipersempit; pekerjaan database itu masih menunggu preflight
      ledger migrasi dan tidak diklaim selesai oleh A89.

- [x] **A90** Tolak pengurutan parsial pada Galeri dan Menu sebelum subset
      menyentuh RPC batch. Kedua aksi sebelumnya memeriksa hanya baris yang ID-nya
      dikirim (`.in("id", ids)`) lalu membandingkan jumlah hasil dengan jumlah ID.
      Daftar parsial yang seluruh ID-nya sah karena itu lolos, kemudian
      `applyOrder(..., 0)` menomori ulang subset dari nol sementara baris yang
      dihilangkan mempertahankan rank lama. `gallery_items`, `menu_categories`,
      dan `menu_items` tidak memiliki batas unik pada `sort_order`, sehingga
      database menerima rank kembar dan urutan publik menjadi tidak deterministik.

      Helper murni `isCompleteReorderSet` kini membandingkan kesamaan himpunan
      dua arah, panjang, serta keunikan daftar kiriman dan daftar database.
      Galeri membaca seluruh ID yang terlihat; kategori Menu membaca seluruh
      kategori; item Menu membaca seluruh item dalam `category_id` yang sudah
      divalidasi. Ruang dan Pengalaman dipindahkan ke helper yang sama agar
      kontrak pengurutan penuh tidak kembali berbeda antar-modul. Jalur generik
      `reorderResource` sengaja tetap berbasis halaman + offset karena A26 hanya
      mengurutkan satu halaman dan harus mempertahankan baris di luar halaman.
      UI Sortable tidak dijadikan batas kepercayaan; aksi server tetap menjadi
      pemeriksa meski klien normal memang mengirim seluruh daftar.

      Kontrak uji baru membuktikan permutasi penuh diterima, subset, ID asing,
      dan duplikat ditolak; Galeri/Menu tidak lagi membatasi lookup ke ID kiriman;
      item Menu tetap dibatasi kategori; serta jalur generik tidak menerima gate
      full-set. Verifikasi akhir: 380/380 uji, lint, typecheck, dan build lulus.
      Batas ini menutup aksi CMS, bukan akses RPC langsung: RPC `reorder_rows`
      tetap menerima subset untuk kebutuhan pengurutan generik berhalaman. Jika
      ancaman klien PostgREST langsung hendak ditutup juga, perlukan RPC full-set
      terpisah dan keluarkan tiga tabel ini dari allowlist RPC lama tanpa merusak
      jalur A26.

- [x] **A91** Tutup balapan antara pengurutan dan mutasi per baris, serta beri
      hasil yang teratribusikan pada baris yang dioperasikan. Sebelumnya daftar
      Sortable dapat mengirim dua simpanan dalam satu event turn, menerima toggle
      atau hapus saat RPC pengurutan memilih rank, atau mengirim pengurutan saat
      mutasi sedang menghapus salah satu ID. Keberhasilan dan kegagalan juga
      bercampur: beberapa manager menelan penolakan, satu memakai `alert()` yang
      memblokir, dan pesan gagal pengurutan diumumkan sebagai `role="status"`
      dengan warna sukses.

      `useRowOperation` dan reducer murni `row-operations` sekarang menjalankan
      tepat satu mutasi per manager. Guard `useRef` menutup klik ganda dalam tick
      yang sama; reducer mengikat completion hanya ke `pendingId` asal sehingga
      completion usang tidak dapat melabeli baris lain. `RowFeedback` memisahkan
      sukses (`role="status"`, token `leaf`) dari gagal (`role="alert"`, token
      `rust`); `RowLink` juga keluar dari urutan tab dan mencegah navigasi ketika
      terkunci. Semua manager Ruang, Pengalaman, Galeri, Menu, dan Beranda
      meneruskan `rowBusy` ke `SortableList`, lalu menerima `reorderBusy` kembali:
      mutasi per baris mengunci seret/panah/simpan urutan dan simpan urutan
      mengunci toggle, duplikat, hapus, edit, serta edit kategori.

      `SortableList` memakai guard single-flight kedua untuk pengurutan, tidak
      memanggil server bagi urutan identik, dan memulihkan baseline tersimpan bila
      penyimpanan gagal. Revalidasi server yang masuk saat simpan berjalan tidak
      lagi dianggap sudah tersinkron terlalu dini: setelah request selesai,
      objek baris baru digabungkan sambil mempertahankan posisi drag lokal bila
      keanggotaan sama; tambah/hapus anggota mengganti daftar dengan versi server.
      Pesan framework produksi yang diredaksi tidak diteruskan mentah; helper
      bersama memberi fallback Indonesia yang dapat ditindaklanjuti. Formulir
      buat Ruang/Pengalaman/Galeri/Menu juga memakai `ActionForm`, sehingga gagal
      simpan tidak melepas formulir dan peringatan perubahan belum tersimpan.

      Kontrak uji mencakup reducer single-flight dan completion usang, guard klik
      ganda, lock dua arah semua manager, tautan terkunci, live-region terpisah,
      urutan identik, rekonsiliasi objek/membership, rollback baseline, serta
      deteksi error Server Action. Batas: lock hanya mengoordinasikan interaksi
      dalam satu manager klien; aksi server dan RPC tetap mempertahankan validasi
      database/RLS sendiri untuk tab atau klien lain.

## Migration process note

`20260910000100_event_promotion_ordering.sql` created a unique index over a
column defaulting to `0`, which would raise `23505` on the second insert; it was
reverted by `…000200`. Net effect is zero, but intermediate migration steps must
never leave a unique index over a non-unique default — squash such pairs before
shipping.
