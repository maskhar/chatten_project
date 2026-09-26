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

      **Lanjutan A91 — antrean unggah media.** Satu gambar dikirim per request
      Server Action, jadi setiap baris antrean menyelesaikan dirinya sendiri.
      Dropzone memakai satu bendera `hasResults` untuk dua pertanyaan yang
      berbeda, dan bendera itu sudah benar begitu berkas pertama selesai. Pada
      kumpulan dua puluh berkas paralel akibatnya: ringkasan muncul di tengah
      jalan dengan angka yang hanya benar untuk satu tick, dan antrean terkunci
      permanen — satu kegagalan di antara sembilan belas keberhasilan hanya bisa
      diperbaiki dengan memuat ulang halaman lalu memilih ulang semua berkas.

      Bendera itu dipecah menjadi dua predikat murni yang berbeda:
      `isQueueUploading` (masih ada request berjalan) dan `isQueueSettled`
      (setiap baris sudah punya hasil). Ringkasan hanya digerbangi oleh yang
      kedua; antrean kosong sengaja tidak dianggap selesai. `canModifyQueue`
      sekarang hanya bergantung pada request yang sedang berjalan, sehingga
      kumpulan yang gagal separuh tetap dapat diperbaiki di tempat.

      Pemulihannya adalah **reset + ulangi hanya yang gagal**:
      `retryFailedQueueItems` menyisakan baris gagal, mengembalikannya ke
      `ready`, dan membersihkan kode/pesan lama; `readyQueueItems` dan
      `startQueueUpload` hanya pernah menyentuh baris `ready`. Berkas yang sudah
      berhasil karena itu tidak mungkin dikirim ulang — bytenya sudah ada di
      Pustaka Media, dan pengiriman kedua hanya akan ditolak sebagai duplikat
      sambil terlihat seperti kegagalan baru bagi operator. `setQueueItemsUploading`
      dihapus karena kontraknya memang yang salah, bukan pemakaiannya.

      Live region diperbaiki sekaligus: sebelumnya seluruh daftar berkas berada
      di dalam `aria-live`, sehingga satu perubahan status membacakan ulang dua
      puluh baris. Kini ada satu paragraf `sr-only` yang selalu ada di DOM —
      region yang muncul bersamaan dengan isinya sering tidak terbacakan — dan
      isinya dikendalikan `queueStatusMessage`: tepat satu kalimat per fase, satu
      saat kumpulan mulai dan satu saat benar-benar selesai. Status setiap baris
      juga selalu tertulis, bukan hanya berwarna, dan warna mentah
      `text-green-800`/`text-red-800`/`bg-red-50`/`border-red-300` diganti token
      `leaf`/`rust`/`blush`/`terracotta` agar baris ini ikut terikat gerbang
      kontras `tests/palette.test.mjs`. Tombol memakai kelas bersama
      `ROW_ACTION_BORDERED`/`ROW_ACTION_DANGER`/`TAP_TARGET` (≥44px).

      **Lanjutan A91 — hasil akhir hapus media.** Hapus media punya tiga hasil
      yang berbeda, bukan dua, dan dua di antaranya memakai kode yang sama.
      `MEDIA_DELETE_ORPHANED` memisahkan "catatan terhapus tetapi berkasnya
      tertinggal di Storage" dari "tidak ada yang berubah, silakan coba lagi":
      yang pertama terminal dan perlu administrator, sehingga menawarkan tombol
      hapus lagi pada baris yang sudah hilang hanya bisa menghasilkan error kedua
      yang menyesatkan. Kedua cabang objek tertinggal — Storage gagal menghapus,
      dan baris yang menyebut bucket di luar penyimpanan Chatten — kini menunjuk
      ke hasil itu dan membawa jalur berkas yang harus dibersihkan.
      Keberhasilan akhirnya membawa pesan sendiri; sebelumnya hasil yang paling
      perlu dikonfirmasi operator justru satu-satunya yang tidak berkata apa pun,
      karena kontrol hanya menulis pesan untuk `status === "error"`.
      `MediaDeleteControl` mengumumkan sukses dengan `role="status"`, berkas yatim
      dengan `role="alert"`, menghilangkan tombol pada kedua keadaan terminal,
      menyembunyikan error percobaan sebelumnya selama percobaan berikutnya
      berjalan, dan memasang `aria-busy`. Pengurutan metadata-dulu, pemeriksaan
      ulang penggunaan, validasi UUID, hitungan baris terdampak, dan penjagaan
      kepemilikan bucket tidak diubah.

      Dua uji yang justru memaku cacat lama ikut diperbaiki maksudnya:
      `media-upload-selection` dulu menuntut `!uploading && !hasResults`, dan
      gerbang label `admin-copy-indonesian` memaku **Hasil terkunci**/**Kosongkan
      pilihan** yang sudah tidak ada. Keduanya kini memaku perilaku baru, termasuk
      penegasan bahwa lock tidak boleh kembali hidup lebih lama dari request.
      Verifikasi akhir: 411/411 uji, typecheck, lint, dan build lulus.
      Batas: pembersihan berkas yatim yang sudah ada belum otomatis — belum ada
      pekerjaan penyapu maupun trigger database, jadi pelaporannya tetap manual
      lewat pesan yang membawa jalur berkas.

### A92 — aksesibilitas papan tombol, target sentuh, dan gambar wajib di CMS

Enam cacat, semuanya tidak terlihat pada tinjauan visual mana pun. Tautan lewati
yang menunjuk ke tempat yang salah tampak identik dengan yang bekerja; `<nav>`
tanpa nama tampak identik dengan yang bernama; `required` yang tidak memvalidasi
apa pun tampak identik dengan yang memvalidasi. Tidak ada satu pun yang dapat
ditangkap typecheck, lint, atau build, jadi setiap perbaikan di bawah ini dipaku
uji kontrak sumber di `tests/admin-landmarks.test.mjs`.

**Tidak ada jalan pintas ke isi halaman.** Sidebar CMS memuat dua puluh satu
tautan, dan `<main>` tidak punya target yang dapat dituju. Pada setiap perpindahan
halaman, operator yang memakai papan tombol atau pembaca layar menekan Tab dua
puluh satu kali untuk mencapai kolom pertama. Sekarang ada tautan lewati sebagai
tautan pertama di dalam dokumen — `sr-only` sampai difokuskan, lalu tampil sebagai
kontrol nyata setinggi 44px, karena `sr-only` saja membuat pengguna papan tombol
yang melihat memfokuskan sesuatu yang tidak kelihatan, dan fokus seolah lenyap
dari halaman. `<main>` memakai `tabIndex={-1}`: tanpa itu banyak peramban
memindahkan gulir tetapi tidak memindahkan fokus, sehingga Tab berikutnya kembali
ke tautan sesudah tautan lewati — lompatan terlihat berhasil padahal tidak. Id-nya
dinamai sekali sebagai `ADMIN_MAIN_ID` di `components/ui/control.ts`, sebab
`href="#admin-main"` yang ditulis langsung di samping `<main>` yang kemudian
diganti nama meninggalkan tautan yang tidak melakukan apa pun tanpa gejala apa pun.

**Dua landmark navigasi tanpa nama.** Sidebar desktop dan drawer ponsel dapat
berada di DOM sekaligus — CSS menyembunyikan salah satunya, DOM memuat keduanya —
sehingga daftar landmark hanya berbunyi "navigation, navigation" dan tidak ada
cara memilih yang benar. Keduanya kini dilabeli `aria-labelledby` ke `<h2
className="sr-only">` masing-masing, dengan id berawalan per instans
(`admin-sidebar-nav`, `admin-drawer-nav`), karena id ganda akan membuat
`aria-labelledby` pada yang kedua menunjuk ke judul yang pertama.

**Judul kelompok bukan judul.** "Situs", "Konten", "Pengaturan", "Administrasi"
adalah `<p>`, jadi tidak muncul di daftar judul dan keanggotaan kelompok hanya
disiratkan oleh jarak antar tautan. Sekarang `<h3>`, dan setiap daftar tautannya
`<ul aria-labelledby>` yang menunjuk judul itu.

**Tabel peran tidak mengatakan apa isinya.** Tanpa `<caption>` ia hanya berbunyi
"table, 4 columns". Tanpa `scope`, sel header tidak terikat kolomnya — dan di
tabel ini justru kolomnya yang menentukan artinya: "Admin" di bawah **Peran saat
ini** adalah keadaan sekarang, "Admin" di bawah **Tetapkan** adalah perubahan yang
belum disimpan. Email baris kini `<th scope="row">`, dan setiap kontrol per baris
menyebut barisnya lewat `aria-label`, sebab di luar konteks tabel "Simpan" tidak
memberi tahu peran siapa yang disimpan. Wadah `overflow-x-auto` di sekitarnya
dapat digulir dengan tetikus dan tidak dengan apa pun selain itu; ia kini
`role="region"` bernama, `tabIndex={0}`, dengan cincin fokus yang terlihat.

**Warna mentah di luar palet dan di luar gerbang kontras.** Gerbang lama hanya
menangkap `text-[#7a5a12]`; ia tidak berkata apa pun tentang `bg-amber-50`, dan
justru bentuk itulah yang dipakai. `border-amber-300`/`bg-amber-50` pada
peringatan migrasi beranda dan `text-red-800` pada tombol hapus CMS tidak terlihat
oleh uji kontras, karena uji itu hanya dapat memeriksa pasangan yang dapat
disebutkan namanya. CMS belum punya nama untuk *peringatan* — bukan sukses, bukan
kegagalan — sehingga ditambahkan `honey` #7a5a12 (5.91:1 di atas permukaannya
sendiri, 5.84:1 di atas `paper`) dan `honey-pale` #fdf6e6, dan keduanya masuk
tabel `INK_ON`. `tests/palette.test.mjs` kini juga memindai dua puluh tiga ramp
bernama Tailwind di seluruh `app/` dan `components/`; `black`/`white` sengaja tidak
termasuk, keduanya bukan jalan pintas palet dan `bg-black/40` adalah cara yang
benar menulis tirai. `DeleteButton` sebelumnya `text-sm text-red-800 underline`
tanpa tinggi sama sekali (±20px) — tombol paling merusak di CMS sekaligus yang
terkecil — sekarang `ROW_ACTION_DANGER`.

**`required` pada MediaPicker tidak pernah memvalidasi apa pun.** Ia hanya
menyembunyikan tombol **Hapus pilihan**, sementara nilainya dikirim melalui
`<input type="hidden">` — dan input bertipe hidden dikecualikan dari validasi
bawaan peramban. Formulir dengan gambar wajib tetap terkirim kosong, dan
kegagalannya muncul sebagai galat server atau, lebih buruk, sebagai baris tanpa
gambar di situs publik. Sekarang ada satu input sentinel yang benar-benar
divalidasi peramban (`required`, tanpa `readOnly`, sebab `readOnly` juga
mengecualikan sebuah kontrol dari validasi), gelembung bawaannya yang berbahasa
Inggris ditekan dan digantikan pesan `role="alert"` berbahasa Indonesia, dan fokus
dipindahkan ke pemilih. Peringatan itu diturunkan (`showMissing = missing &&
!effective`), bukan dibersihkan di dalam efek: membersihkannya di efek memicu
render berantai dan menyisakan satu frame di mana peringatan masih tampak setelah
gambar dipilih.

**Id terpilih yang basi ikut terkirim.** `media.find(...)` mengembalikan
`undefined` bila `value` menyebut gambar yang sudah dihapus dari Pustaka Media,
sehingga kartu "Terpilih" tidak dirender dan layar terlihat seperti belum memilih
apa pun — tetapi input tersembunyi tetap mengirim id lama itu dan baris disimpan
menunjuk ke gambar yang tidak ada. Yang dikirim sekarang `effective`: id hanya
lolos bila benar-benar ada di `media`. Keadaan basi itu dikatakan lewat peringatan
`honey`, bukan didiamkan — membuangnya diam-diam adalah cacat tersendiri, karena
operator lalu tidak dapat mengetahui bahwa baris itu *pernah* punya gambar dan
penyimpanan berikutnya akan mengosongkannya tanpa ada yang memutuskan begitu.

Target sentuh yang dinaikkan ke 44px: dua puluh satu tautan navigasi CMS
(sebelumnya `px-3 py-2`, ±36px), tombol hamburger, tombol tutup drawer, tautan
merek, tombol keluar (sebelumnya `px-3 py-1.5 text-xs`), `<select>` peran dan
tombol Simpan/Tambah pengguna di layar Pengguna, serta seluruh kolom pencarian,
filter kategori, dan tombol kartu di MediaPicker.

Dua uji yang memaku kontrak lama ikut diperbaiki maksudnya: `media-picker`
sebelumnya menuntut `value={selected}` dan `item.id === selected`, yang persis
bentuk cacat id basi itu. Tiga uji baru harus menghapus komentar sebelum mencocokkan
markup, dengan alasan yang sama seperti `tests/palette.test.mjs`: catatan yang
menerangkan *mengapa* `readOnly`, `text-red-800`, atau `<div role="region">` salah
harus dapat mengutipnya, dan regex berbentuk elemen akan mencocokkan kutipannya —
lulus atau gagal berdasarkan prosa, bukan kode.

Verifikasi akhir: 423/423 uji, typecheck, lint, dan build lulus.

Batas: `tests/admin-landmarks.test.mjs` adalah uji kontrak sumber, bukan uji
render. Lapisan admin adalah Server Component yang memanggil `requireAdmin()`,
jadi merendernya memerlukan sesi Supabase — dan uji yang memerlukan sesi hidup
adalah uji yang akhirnya dilewati. Sifat yang dipaku di sini struktural, sehingga
membaca strukturnya cukup; urutan fokus sebenarnya di peramban tetap belum ada
yang mengujinya secara otomatis.

A96 menutup batas ini untuk sisi publik, tetapi **tidak** untuk CMS, dan itu
disengaja: lapisan admin memerlukan sesi Supabase hidup, sehingga ujinya akan
bergantung pada kredensial. Lihat A96 untuk alasan lengkapnya.

### A93 — persempit pemaparan baca media ke peran anonim

`supabase/migrations/20260927000100_media_read_exposure.sql`. Tiga lubang baca
yang saling menutupi, semuanya warisan dari migrasi awal.

Pertama, kebijakan `public_media` adalah `using (true)`. Setiap baris di
`chatten_cafe.media` terbaca oleh siapa pun yang memegang kunci anon — termasuk
gambar yang belum pernah dipakai konten mana pun, yang berarti seluruh Pustaka
Media dapat dibaca dari luar CMS. Kebijakannya sekarang mensyaratkan adanya
baris konten yang merujuk gambar itu. Subkueri rujukannya sendiri dievaluasi di
bawah RLS pemanggil, sehingga `public_content` sudah menyaring `is_active and
status = 'published'` untuk `anon` tanpa perlu diulang di sini. Pustaka Media di
CMS tetap utuh: kebijakan permisif di-OR-kan, dan `cms_manage` tidak disentuh —
gambar yang belum dipakai harus tetap terlihat di CMS, atau ia tidak akan pernah
bisa dipilih. `seo_settings` ikut dihitung sebagai rujukan karena kebijakannya
`using (true)` dan gambar Open Graph memang harus dapat dirayapi.

Kedua, RLS tidak dapat menyembunyikan kolom. Kebijakan baris mempersempit
*baris*; pemaparan kolom adalah soal hak SQL, dan migrasi awal memberi
`grant select on all tables … to anon`. Jadi `bucket`, `storage_path`,
`sha256`, `original_filename`, `mime_type`, `file_size`, dan `uploaded_by`
semuanya terbaca publik. Penyempitannya butuh dua langkah: `revoke select`
lalu `grant select (…)` per kolom. Enam kolom yang tersisa — `id`, `alt_text`,
`width`, `height`, `focal_x`, `focal_y` — adalah tepat yang dirender permukaan
publik; `MediaImage` sendiri hanya membaca `id` (lewat `mediaHref`), `alt_text`,
dan kedua titik fokusnya, sementara `width`/`height` dipakai untuk rasio aspek.
`authenticated` tetap memegang seluruh kolom, karena layar Pustaka Media
menampilkan nama berkas, tipe, ukuran, dan sha256.

Konsekuensinya di sisi aplikasi tidak halus: setelah hak SELECT dipersempit per
kolom, `select("*")` pada tabel media sebagai `anon` tidak mengembalikan lebih
sedikit kolom — ia **gagal seluruhnya**, dan setiap gambar di halaman publik
hilang. Karena itu tiga pemanggilan `select("*")` diganti dengan
`PUBLIC_MEDIA_COLUMNS` di `lib/public-data/media.ts`, satu sumber kebenaran yang
membuat batas itu terbaca di kode, dan `PublicMedia` serta `Media` dipersempit
supaya bentuk tipenya tidak lagi menjanjikan kolom yang tidak boleh dibaca.

Ketiga, bucket `chatten-media` disisipkan dengan `public = true` sementara
kebijakan `storage.objects` bernama `"chatten public read"` juga ada. Keduanya
saling membatalkan: dengan bucket publik, storage-api melayani
`/object/public/...` **tanpa mengevaluasi RLS sama sekali**, jadi kebijakan itu
tidak pernah dibaca. Bucket dipaksa `public = false`, dan kebijakannya
**dihapus, bukan dipersempit** — ia tidak punya pemanggil yang sah. Byte publik
mengalir lewat `app/api/media/[id]/route.ts` di bawah service role, yang
BYPASSRLS dan karenanya tidak pernah menyentuh kebijakan itu; CMS memakai
`"chatten cms manage"`, yang tidak diubah.

### A94 — tolak penghapusan media yang masih dipakai, di basis data

`supabase/migrations/20260927000200_media_delete_guard.sql`. `delete from
media` pada gambar yang masih dipakai saat ini **berhasil**, dan diam-diam
mengosongkan gambar di setiap baris yang merujuknya.

Itu akibat langsung `20260921000500_database_integrity.sql`, yang memasang
sepuluh foreign key dengan `on delete set null`. Pilihan itu benar untuk masalah
yang diselesaikannya — sebelumnya kolomnya `uuid` biasa, jadi media yang dihapus
meninggalkan id menggantung yang gagal dirender — tetapi ia mengubah penghapusan
yang seharusnya *ditolak* menjadi penghapusan yang *berhasil dengan kerusakan
tersebar*. Satu perintah dapat mengosongkan gambar hero, empat item menu, dan
gambar Open Graph sekaligus, tanpa satu pun galat.

Perlindungan yang ada hari ini hanya di aplikasi: `deleteMediaWithFeedback`
memuat peta penggunaan lalu menolak. Itu lapisan yang benar untuk *pesannya* —
ia dapat menyebut konten mana yang memakai gambar itu — tetapi ia bukan batas.
Token sesi CMS bekerja tanpa Server Action: `DELETE /rest/v1/media?id=eq.<uuid>`
lewat PostgREST melewatinya sepenuhnya, dan `cms_manage` mengizinkannya untuk
peran editor. Ada juga balapan yang tidak dapat ditutup di aplikasi — peta
penggunaan dibaca, lalu baris konten baru menunjuk gambar itu, lalu penghapusan
berjalan.

Trigger `media_refuse_delete_in_use` adalah BEFORE DELETE, jadi ia menolak
sebelum `on delete set null` sempat menyentuh apa pun. Ia **SECURITY DEFINER**,
dan ini satu-satunya tempat di skema ini yang memakainya dengan sengaja —
berlawanan dengan `reorder_rows`, yang justru INVOKER supaya `cms_manage` tetap
memutuskan siapa yang boleh menulis. Alasannya berlawanan pula: sebagai INVOKER,
hitungan rujukan berjalan di bawah RLS pemanggil, sehingga baris konten yang
tidak terlihat bagi peran itu tidak terhitung — dan penjaga yang bergantung pada
visibilitas pemanggil bukan penjaga. `search_path` dipatok ke
`chatten_cafe, pg_temp`, dan fungsinya di-`revoke all … from public`.

errcode `23503` (`foreign_key_violation`) dipilih dengan sengaja: inilah yang
akan terjadi bila kesepuluh foreign key itu `on delete restrict` sejak awal, dan
PostgREST memetakannya ke HTTP 409 Conflict — bukan 500.
`isMediaInUseDatabaseError` di `lib/media/delete-state.ts` memetakannya kembali
ke `mediaInUseActionState`, sehingga penolakan dari basis data berbunyi sama
seperti penolakan dari aplikasi. Ia mencocokkan `hint = 'MEDIA_IN_USE'` lebih
dulu, dengan pasangan kode + teks pesan sebagai cadangan, karena PostgREST
meneruskan errcode apa adanya tetapi tidak selalu meneruskan hint.

`tests/media-exposure-boundary.test.mjs` (13 uji) memaku kedua sisi: enam kolom
di migrasi harus sama dengan enam kolom di `PUBLIC_MEDIA_COLUMNS`, tidak ada
permukaan publik yang boleh `select("*")` pada media, dan daftar sepuluh tabel
rujukan harus identik di tiga tempat — kebijakan baca, trigger penjaga, dan
`mediaUsageQueryDefinitions`. Larangan `select("*")` sengaja mengecualikan
pohon `admin/`: Pustaka Media berjalan sebagai `authenticated` dan memang
membutuhkan seluruh kolom.

Verifikasi: 436/436 uji, typecheck, lint, dan build lulus.

**Penerapan butuh jendela pemeliharaan.** Basis data ini dipakai bersama tenant
lain, dan kedua migrasi ini mengubah hak baca serta memasang trigger pada tabel
yang hidup. Tidak ada mutasi basis data yang dilakukan saat menulis keduanya —
yang ada di repositori baru berupa berkas.

Prapemeriksaan buku besar: tidak ada skema `supabase_migrations` dan tidak ada
buku besar migrasi Chatten di basis data ini, sehingga tidak ada cara otomatis
mengetahui migrasi mana yang sudah diterapkan. Buku besar itu **tidak dibuat**
di sini: membuatnya mengubah struktur basis data bersama dan memerlukan
otorisasi tersendiri. Urutan penerapan harus dipastikan manual sebelum
menjalankan keduanya.

**Diterapkan 2026-09-27** (lihat A98 untuk cacat yang ditemukan tepat sebelum
penerapan, urutan penerapan yang dipakai, dan hasil verifikasinya).

### A95 — aksesibilitas sisi publik: landmark, fokus, target sentuh, alt

Perlakuan yang sama seperti A92, kali ini untuk sebelas halaman publik.

**Landmark utama ada di tempat yang salah pada sepuluh dari sebelas halaman.**
Shell membungkus anaknya dalam `<div id="main-content" tabIndex={-1}>`, dan
setiap halaman kecuali beranda merender `<main>` sendiri — *setelah* `PageHero`.
Akibatnya bagian hero dan satu-satunya `<h1>` halaman itu berada **di luar**
landmark utama, dan tautan lewati-ke-konten melompat ke sebuah `<div>` yang
bukan landmark sama sekali: pengguna papan tombol yang memakainya justru
melewati judul halaman. Shell memiliki `<main>` sekarang; kedua belas halaman
merender `<div>` dan tetap memegang spasinya sendiri. `app/error.tsx` justru
kebalikannya dan tetap membawa `<main>` sendiri, karena ia sengaja tidak
merender `PublicShell` — boundary galat yang bergantung pada pemuat data yang
sama dengan yang baru saja gagal adalah boundary yang ikut gagal.

**Satu `<section>` tanpa nama yang dapat diakses.** Band testimoni di beranda
hanya punya `<p>` bergaya sebagai pengantar — tanpa `aria-label`, tanpa heading
— sehingga ia bukan region dan hilang dari navigasi pembaca layar, satu-satunya
band beranda yang begitu. Pengantar itu dinaikkan menjadi `<h2>` yang secara
visual memang sudah ia perankan. Urutan heading di seluruh sisi publik ternyata
bersih: tidak ada halaman tanpa `h1`, tidak ada yang punya dua, tidak ada
tingkat yang dilewati.

**Fokus yang tidak terlihat, pada sembilan kontrol.** Tautan berbingkai "Plan
Your Visit" di header tidak punya gaya fokus apa pun — satu-satunya tombol
berbingkai di header adalah satu-satunya kontrol yang tidak dapat ditelusuri
pengguna papan tombol. Ketiga tautan di drawer navigasi ponsel juga kosong,
sehingga menu ponsel dapat dibuka dengan papan tombol lalu tidak dapat diikuti.
Footer — yang tampil di setiap halaman, menjadi perhentian tab terakhir, dan
memuat tautan sosial keluar — mendapat `TAP_TARGET` di A71 tetapi cincinnya
tertinggal. Dan ketiga kartu-sebagai-tautan di Events, Experience, dan Spaces
hanya menyisakan outline bawaan peramban: bukan tidak terlihat, tetapi tanpa
indikator yang dirancang, digambar rapat di atas foto yang mengisi separuh atas
kartu. `CARD_FOCUS` ditambahkan ke `components/ui/control.ts` untuk pola
terakhir itu, `ring-inset` dengan alasan yang sama seperti cincin shell: kartu
selebar layar membuat cincin outset terpotong di tepi viewport pada ponsel.

**Dua salinan tangan dari satu mekanisme.** `SKIP_LINK` sudah dinamai di A92,
dan `skip-to-content.tsx` tetap memegang salinannya sendiri — yang menghilangkan
cincinnya. `cta.tsx` menyalin `FOCUS_RING` dari sebelum token itu ada, dan
salinannya sudah menyimpang: ia menghilangkan `focus-visible:outline-none`,
sehingga peramban yang menggambar outline sendiri *dan* cincinnya menggambar
dua. Keduanya mengimpor sekarang. Dua salinan satu mekanisme adalah persis
bagaimana yang publik diam-diam tertinggal.

**Target sentuh di bawah 44px.** Tautan berbingkai header (`px-4 py-2` pada
`text-sm`, ±36px) dan `components/ui/button.tsx` (±36px, juga tanpa cincin).
Satu-satunya pemanggil `Button` adalah tombol Masuk di formulir login CMS —
kontrol pertama yang ditemui pengguna papan tombol di aplikasi ini, dan
satu-satunya tempat di mana sesi belum ada sehingga tidak ada hal lain yang
dapat memulihkannya.

**Alt text yang mengumumkan hal yang sama dua kali.** Kartu di daftar Events
memakai `alt={asset?.alt_text ?? event.title}`, dan `event.title` adalah `<h2>`
di dalam `<a>` yang sama. Halaman detail Event lebih jauh lagi: ia merender
`<MediaImage>` kedua atas **aset yang sama** dengan yang sudah ditampilkan
hero, dengan judul acara sebagai cadangan alt — jadi satu foto muncul dua kali
dan judulnya diumumkan dua kali berturut-turut, sekali sebagai `h1` dan sekali
sebagai alt. Gambar duplikatnya dihapus; hero tetap memegangnya.

**Satu band yang membuang alt text dari CMS.** Grid galeri di beranda lewat
`visual()`, pembantu yang memaksa `alt=""` — benar untuk latar dan hero
dekoratif, dan itu sebabnya pembantu itu ada. Tetapi grid galeri adalah satu
band di beranda yang gambarnya *adalah* kontennya, tanpa teks di dekatnya yang
menerangkan tiap petak. `/gallery` selalu meneruskan `item.alt_text`; beranda
sekarang juga, dengan memanggil `MediaImage` langsung dan membungkus petaknya
dalam `<figure>`.

Tidak ditemukan cacat: tidak ada `<img>` mentah di sisi publik, tidak ada
kontrol khusus-ikon tanpa nama, tidak ada `alt` yang benar-benar hilang
(`MediaImage` selalu menghitungnya dan memberi `aria-hidden` pada yang
dekoratif), tidak ada elemen yang membuang outline tanpa penggantinya, dan tidak
ada kontrol formulir sama sekali di sisi publik.

`tests/public-landmarks.test.mjs`, 13 uji. Ia menghapus komentar sebelum setiap
pencocokan berbentuk elemen, dengan alasan yang sama seperti
`tests/palette.test.mjs`: catatan yang menerangkan *mengapa* `<main>` dulu salah
harus dapat mengutip `<main>`, dan regex berbentuk elemen akan mencocokkan
kutipannya — lulus atau gagal berdasarkan prosa, bukan kode.

Verifikasi: 449/449 uji, typecheck, lint, dan build lulus.

Batas yang sama seperti A92: ini uji kontrak sumber, bukan uji render. Halaman
publik adalah Server Component yang memanggil Supabase, jadi merendernya
memerlukan basis data.

Batas itu **sudah ditutup untuk sisi publik** oleh A96 di bawah: urutan fokus di
peramban sebenarnya sekarang diuji oleh `tests/e2e/focus-order.spec.ts`.

### A96 — uji render nyata: urutan fokus di peramban

Menutup batas yang dicatat dua kali di berkas ini, di bawah A92 dan di bawah A95:
"urutan fokus sebenarnya di peramban masih belum ada yang mengujinya secara
otomatis."

**Mengapa uji sumber tidak cukup di sini.** `tests/public-landmarks.test.mjs`
membaca teks berkas. Itu memadai untuk sifat struktural — sebuah `<main>` ada
atau tidak ada — dan itu pilihan yang tepat untuk lapisan admin. Tetapi urutan
tab tidak ditentukan oleh urutan tulis JSX. Ia ditentukan oleh urutan dokumen
setelah render, dan dibelokkan oleh tiga hal yang semuanya ada di situs ini:
`tabIndex={-1}` pada `<main>` milik shell, `display: none` pada bagian beranda
yang disembunyikan operator, dan tautan lewati yang `sr-only` sampai ia
difokuskan. Tidak satu pun dari ketiganya dapat dibaca dari sumber.

`tests/e2e/focus-order.spec.ts` mengendarai Chrome sungguhan pada delapan halaman
publik dan memeriksa lima hal per halaman: tautan lewati adalah perhentian Tab
*pertama* dan benar-benar tergambar saat difokuskan; menekannya memindahkan fokus
ke `<main id="main-content">`; perhentian sesudahnya tidak kembali ke header;
tidak ada kontrol yang mengambil fokus sambil tak terlihat atau `aria-hidden`;
dan setiap perhentian menggambar indikator fokus. Ditambah satu uji bahwa kontrol
di dalam bagian `display: none` benar-benar keluar dari urutan tab.

**Tidak memerlukan basis data.** `getShellData` menelan kegagalannya sendiri dan
setiap pemuat publik jatuh ke keadaan kosong, jadi struktur halaman tetap utuh
tanpa Supabase. Berkas ini karena itu tidak memakai kredensial apa pun, berbeda
dari `auth-smoke.spec.ts`. Konsekuensinya: `/menu`, `/gallery` dan `/events`
tidak punya satu pun kontrol di dalam `<main>` tanpa data, sehingga tuntutan
"perhentian sesudah lompatan ada di dalam `<main>`" hanya diterapkan kalau
`<main>` memang punya kontrol. Menuntut lebih berarti menuntut adanya data, dan
uji yang menuntut adanya data adalah uji yang menjadi rapuh.

**Dua kesalahan pada uji itu sendiri, keduanya ditemukan dengan menjalankannya.**
Keduanya layak dicatat karena keduanya adalah cara uji peramban gagal secara
diam-diam.

1. *27 uji gagal, dan aplikasinya benar.* Versi pertama menyetel ulang fokus
   dengan `body.click({ x: 1, y: 1 })`. Klik menetapkan **titik awal fokus
   berurutan** di tempat yang diklik, dan titik (1,1) berada di atas tautan
   lewati itu sendiri — sehingga Tab berikutnya melangkah ke kontrol
   *sesudahnya*, dan tautan lewati tampak bukan perhentian pertama. Setelah
   `page.goto()` titik awalnya sudah berada di awal dokumen. Kliknya dibuang.
2. *41 uji lulus, dan aplikasinya rusak.* Setelah hijau, tautan lewati sengaja
   diturunkan menjadi `className="sr-only"` saja — tepat regresi yang seharusnya
   ditangkap A95 — lalu build itu diuji ulang. Seluruh 41 uji tetap lulus.
   Sebabnya `toBeVisible()` milik Playwright: sebuah elemen `sr-only` berukuran
   1x1 dengan `clip-path: inset(50%)` masih "visible" baginya, karena kotak tata
   letaknya bukan nol. Yang membedakan tautan yang benar dari yang rusak hanya
   ukuran — 135x44 utuh versus 1x1 terpotong. Assertion-nya diganti menjadi
   pengukuran `getBoundingClientRect()` plus `clip-path`. Terhadap build yang
   dirusak itu, 8 uji gagal, satu per halaman. Sesudahnya komponennya
   dipulihkan, dibangun ulang, dan 41/41 lulus lagi.

   Pemeriksaan cincin fokus diperketat dengan alasan yang sama: Tailwind selalu
   memancarkan beberapa lapis `box-shadow`, dan lapisan yang tidak aktif keluar
   sebagai `rgba(0, 0, 0, 0) 0px 0px 0px 0px`. Jadi `!== "none"` saja akan
   meluluskan cincin yang seluruhnya transparan. Yang dihitung sekarang adalah
   adanya sedikitnya satu lapis yang tidak transparan dan punya sebaran.

**Bukan bagian dari gerbang.** `npm test` adalah `node --test tests/**/*.test.mjs`
dan tidak memungut `tests/e2e/*.spec.ts`; CI juga tidak menjalankannya. Keduanya
harus lulus tanpa server yang berjalan, sedangkan berkas ini memerlukan
`npm start`. Menjalankannya:

```bash
npm run build && npm start
```

```bash
PLAYWRIGHT_CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe" npm run e2e:focus
```

`playwright.config.ts` sudah punya cabang `PLAYWRIGHT_CHROME_PATH` →
`launchOptions.executablePath`, jadi Chrome sistem dipakai dan tidak ada peramban
yang perlu diunduh. `E2E_APP_URL` menunjuk ke instance lain kalau port 3000 sudah
terpakai.

**Yang tetap belum tertutup.** Lapisan CMS. Urutan fokusnya masih hanya diuji
dari sumber, karena merendernya memerlukan sesi Supabase hidup — dan itu
menunggu kredensial uji sementara yang belum ada. Batas A92 tetap berlaku apa
adanya untuk `/admin`.

Verifikasi: 449/449 uji, typecheck, lint, dan build lulus; 41/41 uji fokus lulus
di Chrome sungguhan, dan terbukti gagal (8 dari 41) terhadap regresi yang
disengaja.

### A97 — CI dinonaktifkan sementara karena kunci tagihan

Keadaan, bukan perbaikan. Dicatat di sini supaya tidak ada yang mengira gerbang
otomatisnya hilang karena rusak.

Sejak PR #1 dibuka, tidak ada satu pun run CI yang benar-benar berjalan. Keenam
run terakhir semuanya membawa anotasi yang sama:

> The job was not started because your account is locked due to a billing issue.

Kata kuncinya "was not started". Runner menolak memberi mesin, jadi `npm test`,
`typecheck`, `lint`, dan `build` tidak pernah dieksekusi sama sekali.
`gh run view --log-failed` menjawab `log not found` karena tidak ada log yang
pernah dihasilkan. Durasi 2s dan 1s adalah tanda khas penolakan itu; satu run
sempat tercatat 38s dan itu sempat tampak seperti kegagalan nyata, tetapi
anotasinya identik — 38s itu waktu mengantre, bukan waktu berjalan.

Akibatnya setiap push memasang check merah pada PR yang bukan kegagalan kode,
dan monitor Autofix berbunyi berulang karena ia membaca "check gagal" tanpa
dapat melihat sebabnya.

**Keputusan operator: matikan workflow, jangan hapus berkasnya.**

```bash
gh workflow disable CI --repo maskhar/chatten_project
```

Berkas `.github/workflows/ci.yml` sengaja dipertahankan utuh. Menghapusnya akan
membuang seluruh alasan yang tertulis di dalamnya — termasuk sebab ia dibuat:
PR #1 terbuka dengan `0 passing / 0 failing / 0 pending`, artinya tidak ada apa
pun yang menghalangi perubahan gagal-uji ikut ter-merge. Alasan itu tidak
berubah hanya karena tagihannya terkunci.

**Selama mati, gerbangnya pindah ke mesin lokal, bukan hilang.** Keempatnya
dijalankan manual sebelum setiap push:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Risiko yang diterima dengan sadar: gerbang lokal bergantung pada disiplin dan
tidak terlihat oleh peninjau — persis kelemahan yang CI ini dibuat untuk
menutup. Karena itu keadaan ini sementara, bukan desain baru.

**Menyalakannya kembali** setelah tagihan beres:

```bash
gh workflow enable CI --repo maskhar/chatten_project
```

Run yang sudah gagal dapat dijalankan ulang tanpa commit baru:

```bash
gh run rerun 36263766695 --repo maskhar/chatten_project
```

Baris proteksi branch `main` di `docs/RELEASE_CHECKLIST.md` tetap belum
tercentang, dan sekarang ada dua hal yang menghalanginya: setelannya belum
diaktifkan di GitHub, dan check yang akan diwajibkannya sedang mati. Keduanya
harus beres sebelum baris itu dicentang.

Catatan sampingan dari anotasi yang sama, tidak terkait kegagalan ini:
`ubuntu-latest` bermigrasi ke Ubuntu 26 mulai 19 Oktober 2026. Pin sekarang
`ubuntu-latest` dengan Node 24, jadi runner akan ikut berpindah tanpa
pemberitahuan. Mematoknya ke `ubuntu-24.04` akan membuat kenaikan itu menjadi
keputusan, bukan kejutan — belum dilakukan, menunggu CI hidup lagi supaya
perubahannya dapat diverifikasi.

### A98 — penerapan A93/A94, dan route media yang akan gelap karenanya

Kedua migrasi diterapkan ke basis data Supabase swakelola pada 2026-09-27,
masing-masing dalam satu transaksi `psql -v ON_ERROR_STOP=1
--single-transaction` terhadap service `db`, dengan cara yang sama seperti
migrasi 2026-09-26. Tetapi tidak langsung: gladi bersih menemukan satu cacat
yang harus diperbaiki *lebih dulu*, dan itu mengubah urutan penerapannya.

**Cacatnya.** `app/api/media/[id]/route.ts` mencari baris media di bawah
konteks pemanggil — itu gerbang A89, dan benar — dengan
`select("bucket,storage_path,mime_type")`. Ketiga kolom itu adalah tepat yang
dicabut A93 dari `anon`. Karena hak per kolom tidak memangkas hasil melainkan
menolak seluruh kueri, setiap pengunjung publik akan menerima 404 dari route
itu, dan **setiap gambar di situs hilang** begitu migrasi diterapkan. Tidak ada
uji yang menangkapnya: `tests/media-exposure-boundary.test.mjs` melarang
`select("*")` pada media, dan route ini tidak memakai `select("*")`. Ini
dibuktikan sebelum disentuh, bukan disimpulkan: A93 dijalankan dalam transaksi
yang dibatalkan, lalu `set local role anon; select bucket, storage_path,
mime_type from chatten_cafe.media` menjawab `permission denied for table
media`, sementara enam kolom publiknya berhasil.

**Perbaikannya** memisahkan dua pertanyaan yang tadinya dijawab satu kueri.
Pemeriksaan visibilitas tetap di konteks pemanggil dan hanya meminta `id` —
kebijakan `public_media` yang dipersempit tetap berlaku di sana, jadi media
yang tidak dirujuk konten mana pun tetap 404 bagi pengunjung. Baru setelah
lolos, `bucket`, `storage_path`, `mime_type` dibaca oleh klien service role —
satu-satunya konteks yang memang boleh melihatnya — dan tetap diperlakukan
sebagai data tidak tepercaya oleh `isMediaBucket`, `isSafeMediaStoragePath`,
dan `mediaContentDisposition`, tanpa perubahan. Uji baru di
`tests/media-exposure-boundary.test.mjs` memaku bahwa pencarian
konteks-pemanggil hanya boleh menyebut kolom yang dimiliki `anon`, dan bahwa
kolom penyimpanan datang dari klien service role. Uji itu dibuktikan bisa
merah: mengembalikan select lama menggagalkannya dengan pesan yang menyebut
ketiga kolom.

**Urutan penerapan.** Kode baru (`select("id")`) bekerja di kedua keadaan
basis data; kode lama hanya bekerja di keadaan lama. Jadi aplikasinya dibangun
dan container `chatten_project-app-1` diganti *lebih dulu*, diverifikasi
route-nya masih 200 terhadap basis data pra-migrasi, baru migrasi dijalankan.
Jendela gelapnya nol — bukan "beberapa detik" seperti diperkirakan A93.

**Verifikasi di basis data**, dalam transaksi yang dibatalkan supaya data
nyata tidak berubah (lima baris media, nol sisa baris audit sesudahnya):

- `public_media` kini `exists(...)` atas sepuluh tabel rujukan; `cms_manage`
  tidak berubah.
- `anon` memegang SELECT hanya pada `alt_text, focal_x, focal_y, height, id,
  width`; tidak ada SELECT tingkat tabel. `authenticated` tetap penuh.
- `select bucket …` dan `select storage_path …` sebagai `anon` ditolak,
  `42501`.
- Media yang tidak dirujuk: `anon` melihat 0 baris. Setelah satu baris
  `gallery_items` sementara (published, aktif) merujuknya: 1 baris, enam kolom.
- `delete` pada media yang dirujuk ditolak: `ERROR: Media … is referenced by
  1 content row(s)`, `HINT: MEDIA_IN_USE`, dan baris rujukannya **tetap utuh**
  — `on delete set null` tidak sempat menyentuhnya. Media yang tidak dirujuk
  tetap bisa dihapus.
- Fungsinya `prosecdef = t`, `search_path=chatten_cafe, pg_temp`; trigger
  BEFORE DELETE aktif.
- `"chatten public read"` hilang dari `storage.objects`; bucket `public = f`.

**Verifikasi lewat HTTP**, pada container yang berjalan:

- `GET /api/media/<id>` untuk media yang tidak dirujuk: 404 (sebelum
  migrasi 200 — itu memang lubang yang ditutup).
- PostgREST sebagai `anon`, `select=*` pada media: 401 `permission denied for
  table media`; `select=id,alt_text,width,height,focal_x,focal_y`: 200.
- `/storage/v1/object/public/chatten-media/<path>`: 400 (bucket privat).
- Enam halaman publik: 200, log container bersih.

Gerbang lokal: 450/450 uji, typecheck, lint, build.

**Temuan di luar batas Chatten, TIDAK disentuh.** Pemeriksaan
`/storage/v1/object/authenticated/chatten-media/<path>` dengan kunci `anon`
menjawab **200**, padahal `"chatten public read"` sudah dihapus. Sebabnya
kebijakan milik tenant lain pada `storage.objects`:

```
Public Access                  | SELECT | PUBLIC | true
Public upload for development  | INSERT | PUBLIC | bucket_id = '3d-models'
Public update for development  | UPDATE | PUBLIC | bucket_id = '3d-models'
```

`"Public Access"` adalah `using (true)` tanpa batas bucket, jadi ia memberi
siapa pun — termasuk pemegang kunci anon — hak baca atas objek di **semua**
bucket instance ini, bukan hanya milik tenant yang membuatnya. Bagi Chatten,
akibatnya A93 menutup pintu depan tetapi jendela tetangga terbuka: byte objek
masih dapat diunduh oleh siapa pun yang mengetahui `storage_path`, meski
`storage_path` sendiri kini tidak lagi terbaca `anon`. Kebijakan itu bukan
milik proyek ini, ada di tabel bersama, dan mempersempitnya dapat mematahkan
tenant yang bergantung padanya; karena itu ia **tidak diubah** dan dicatat di
sini sebagai keputusan operator instance. Perbaikan yang benar ada di pihak
pemiliknya: mengganti `true` dengan daftar bucket yang memang publik.

> **Ditindaklanjuti 2026-09-27.** Setelah dikuantifikasi, dampaknya jauh lebih
> besar daripada sekadar "jendela tetangga terbuka" dan operator memutuskan
> mempersempit kebijakannya. Lihat A99.

### A99 — kebijakan `Public Access` pada storage.objects dipersempit ke 16 bucket publik

A98 mencatat `"Public Access"` sebagai temuan di luar batas dan tidak
menyentuhnya. Pengukuran lanjutan menunjukkan itu keputusan yang salah untuk
dibiarkan: yang bocor bukan hanya byte objek Chatten bagi orang yang sudah tahu
`storage_path`-nya, melainkan **dokumen privat tenant lain, dengan jalur yang
dapat dienumerasi**. Dibuktikan dengan kunci `anon` Chatten — kunci yang
tertanam di bundel peramban setiap pengunjung, jadi setara publik:

```
GET  /storage/v1/object/authenticated/release-invoices/<uid>/<id>/SPB-202609-….pdf → 200
POST /storage/v1/object/list/release-invoices                                     → 200  (berisi user id)
```

Yang pertama menyerahkan faktur pembayaran per-pengguna milik tenant SoundPub.
Yang kedua berarti jalurnya tidak perlu ditebak: isi bucket privat dapat
didaftar. Sembilan bucket privat terpapar; delapan di antaranya punya kebijakan
baca sendiri yang jauh lebih ketat, dan semuanya sia-sia — **kebijakan permisif
di-OR-kan**, jadi satu `using (true)` mengalahkan setiap kebijakan lain di tabel
yang sama.

**Yang dilakukan.** `ops/storage-public-access-narrow.sql` mengganti
`using (true)` dengan daftar literal ke-16 bucket yang memang `public = true`.
Berkasnya di `ops/`, bukan `supabase/migrations/`, karena `storage.objects`
adalah tabel bersama di luar `chatten_cafe`; migrasi Chatten tidak boleh
menyentuhnya, dan penerapannya adalah tindakan operator instance, bukan bagian
dari rilis aplikasi ini.

Tiga alasan bentuknya seperti itu:

- **Tidak dihapus, dipersempit.** Jalur `/object/public/<bucket>/…` tidak
  mengevaluasi RLS sama sekali untuk bucket `public = true` — diverifikasi
  dengan mengambil objek tanpa kunci apa pun (200). Akses publik yang sah tidak
  bergantung pada kebijakan ini. Tetapi delapan bucket publik tidak punya
  kebijakan baca sendiri (`article`, `blog-covers`, `contracts`, `learning`,
  `lelanganproperti`, `mentor`, `school-logo`, `template`), sehingga menghapus
  kebijakan ini akan mematahkan tenant yang membacanya lewat
  `/object/authenticated/` atau `/object/list/`.
- **Daftar literal, bukan subkueri ke `storage.buckets`.** Kebijakan yang
  membaca kolom `public` akan otomatis ikut membuka bucket privat mana pun yang
  kelak dijadikan publik oleh tenant lain — tanpa keputusan sadar siapa pun.
- **Pemulihan satu perintah**, tercatat di kepala berkas, bila ada tenant yang
  ternyata patah.

**Gladi bersih lebih dulu.** Dijalankan di `psql --single-transaction` yang
di-rollback: 9 bucket privat turun ke 0 baris terlihat `anon`, 12 bucket publik
yang berisi objek tetap utuh, total terlihat `anon` 2937, `EXIT=0`. Baru setelah
angkanya persis sesuai harapan, kebijakannya diterapkan sungguhan.

**Verifikasi setelah penerapan.**

- `GET /object/authenticated/release-invoices/<uid>/…/SPB-….pdf` → **400**
  (sebelumnya 200).
- `POST /object/list/` untuk `release-invoices`, `contracts`, `chatten-media`,
  `task`, `school-logo`, `mentor` → `[]`. Perhatikan: storage-api menjawab
  **200 dengan array kosong** ketika RLS menyaring seluruh baris, jadi kode
  status saja menyesatkan di sini — badan jawabannya yang menentukan.
- Bucket publik tetap terbaca: `gallery` 2, `avatars` 56, `daily-report` 100,
  `iccn-gallery` 1, `article` 1, `template` 1 objek.
- `GET /object/public/article/…png` dan `/object/public/avatars/…/avatar.png`
  tanpa kunci apa pun → 200.
- Delapan halaman publik Chatten (`/`, `/menu`, `/gallery`, `/about`, `/visit`,
  `/events`, `/experience`, `/spaces`) → 200; log container bersih.
- `pg_policies` mengonfirmasi ekspresi barunya `bucket_id = ANY (ARRAY[...])`.

**Catatan `/api/media/<id>` → 404 itu benar.** Basis data berisi 5 baris media
dan **nol** rujukan dari tabel konten mana pun (`hero_slides`, `menu_items`,
`gallery_items`, `about_sections`, `spaces`, dst. semuanya 0). Kebijakan
`public_media` A93 menyaring media ke yang benar-benar dirujuk konten, jadi 404
untuk kelima baris itu adalah perilaku yang dirancang, bukan regresi. Angka ini
juga menjelaskan mengapa halaman publik tidak kehilangan gambar apa pun: belum
ada gambar Chatten sungguhan yang terpasang ke konten (lihat butir "Real
Chatten imagery" di `docs/RELEASE_CHECKLIST.md`).

**Masih terbuka, di luar batas Chatten: sisi TULIS.** Dua kebijakan yang tersisa
memberi PUBLIC hak menulis ke bucket `3d-models`:

```
Public upload for development  | INSERT | PUBLIC | with_check: bucket_id = '3d-models'
Public update for development  | UPDATE | PUBLIC | with_check: (null)
```

Dibuktikan sebagai `anon` di dalam transaksi yang di-rollback pada 2026-09-27:
`insert into storage.objects (bucket_id, name, …) values ('3d-models', …)`
**berhasil**, dan `update storage.objects … where bucket_id = '3d-models'`
mengenai **11 baris**. Artinya siapa pun pemegang kunci anon dapat menitipkan
berkas ke bucket itu dan menimpa metadata objek yang sudah ada. Tidak ada objek
Chatten di `3d-models`, jadi ini tidak memengaruhi proyek ini, dan namanya
("for development") menyiratkan sisa pengembangan yang lupa dicabut.
**Tidak diubah** — ia milik tenant lain dan mencabutnya dapat mematahkan alur
unggah mereka; dilaporkan ke operator instance untuk diputuskan.

### A100 — pengoptimal gambar menggelapkan seluruh thumbnail CMS setelah A93

Ditemukan saat verifikasi item #2, dengan cara yang tidak bisa ditemukan cara
lain: login ke CMS sebagai operator sungguhan. Semua pemeriksaan A98 dan A99
dijalankan di sisi publik dan lewat `curl`, dan semuanya hijau — tetapi Pustaka
Media dan setiap pemilih gambar menampilkan kotak kosong. Lima permintaan
`_next/image` menjawab **400**, dan log container mengatakan
`The requested resource isn't a valid image for /api/media/<id> received null`.

**Sebabnya bukan RLS dan bukan route.** Pengoptimal gambar Next mengambil `src`
dari SISI SERVER — proses Next yang meminta URL-nya, bukan peramban — sehingga
cookie sesi operator tidak pernah ikut terkirim. Sejak A93 mempersempit
`public_media` ke media yang benar-benar dirujuk konten, `/api/media/<id>` yang
diminta tanpa sesi berjalan sebagai `anon`, tidak menemukan baris, dan menjawab
404; pengoptimal menerjemahkannya menjadi 400. Dibuktikan berdampingan di satu
konteks peramban yang sudah login:

```
dengan cookie sesi  /api/media/<id>                     -> 200
lewat pengoptimal   /_next/image?url=%2Fapi%2Fmedia%2F… -> 400
```

Route-nya benar. Kebijakan `public_media`-nya benar. Yang salah adalah **siapa
yang mengambil**.

**Kenapa ini bukan kasus khusus satu layar.** Pengoptimal tidak membawa
identitas pemanggil, jadi ia tidak akan pernah bisa melayani gambar yang butuh
otorisasi — apa pun yang berhasil ia ambil justru yang `anon` juga boleh ambil.
Karena itu menambal `src` tidak menyelesaikan apa pun; yang harus berubah adalah
pengambilnya.

**Perbaikan.** `components/admin/cms-image.tsx` menjadi satu-satunya jalur
gambar CMS: `<img>` biasa, sehingga peramban operator yang mengambil, cookie
sesinya terkirim, dan route yang sudah benar menjawab 200. Dua belas pemakaian
`<Image>` di sembilan berkas sisi admin dipindahkan ke sana. Tidak ada jalur
baca baru, tidak ada perubahan basis data, batas A93 utuh.

Dipilih setelah menimbang alternatifnya: route bisa saja menerbitkan URL
bertanda tangan berbatas waktu yang boleh diambil pengoptimal tanpa cookie, dan
thumbnail tetap teroptimasi — tetapi itu menambah jalur baca kedua ke media yang
berlaku **tanpa sesi**, persis permukaan yang baru saja dipersempit A93, beserta
HMAC, kedaluwarsa, penolakan replay, dan uji negatifnya. Harga keamanannya tidak
sebanding dengan keuntungan yang hanya dirasakan operator.

**Harga yang dibayar, dengan sadar.** Thumbnail CMS memuat berkas aslinya tanpa
resize (terbesar 1.8 MB dari 5 media). Yang menanggung hanya operator di
jaringan yang ia kenal, bukan pengunjung; `loading="lazy"` menahan yang di luar
viewport. Bila pustaka tumbuh sampai ini terasa, jawabannya adalah turunan
ukuran kecil yang dibuat saat unggah dan disimpan sebagai objek tersendiri —
bukan menghidupkan kembali pengoptimal di jalur yang tidak membawa sesi.

**Sisi publik sengaja TIDAK ikut berubah** dan itu dipaku oleh tes.
`components/public/media-image.tsx` tetap memakai `next/image`: media yang
dirujuk konten memang boleh dibaca `anon`, jadi ambilan pengoptimal berhasil di
sana — dan justru di sanalah resize dibutuhkan, karena yang mengunduh adalah
pengunjung dengan kuota data. Menyalin pola CMS ke sisi publik akan mengirim
berkas asli ke setiap ponsel.

**Tes.** `tests/cms-image-fetcher.test.mjs` (5 uji) memaku pembagian itu dari
kedua arah: tidak ada berkas admin yang mengimpor `next/image`, `CmsImage`
merender `<img>` dan tidak membungkus `next/image`, sisi publik tetap memakai
pengoptimal dengan `sizes`, dan tidak ada berkas publik yang mengimpor
`CmsImage`. Kemampuannya menangkap regresi dibuktikan, bukan diasumsikan:
`<Image>` dipasang kembali di Pustaka Media dan uji pertama gagal dengan
`next/image fetches server-side without the session cookie, so these screens
will render empty boxes: app\admin\(dashboard)\media\page.tsx`, lalu berkasnya
dipulihkan dan `git diff --stat` memastikan hanya perubahan yang dimaksud.

**Verifikasi di peramban sungguhan**, setelah container dibangun ulang, login
sebagai operator: `/admin/media`, `/admin/gallery`, `/admin/spaces`,
`/admin/experiences`, `/admin/events`, `/admin/promotions` masing-masing
**5/5 gambar terlukis** (`naturalWidth > 0`, jadi byte-nya benar-benar tiba dan
ter-dekode), `loading="lazy"` aktif, dan **nol** respons ≥ 400. Tangkapan layar
Pustaka Media memperlihatkan kelima thumbnail terpasang.

Gerbang lokal: 455/455 uji, typecheck, lint, build.

**Catatan.** Beranda publik memuat 0 gambar — bukan akibat perubahan ini,
melainkan karena tidak ada satu pun media yang dirujuk konten (lihat A99).

### A101 — dua kebijakan tulis anonim pada storage.objects dicabut

A99 mempersempit **baca** pada `storage.objects`. Pemeriksaan lanjutannya
menemukan bahwa **tulis** masih terbuka lebar untuk siapa pun tanpa login:

| Kebijakan | Perintah | Peran | Syarat |
| --- | --- | --- | --- |
| `Public upload for development` | INSERT | `{public}` | `with_check: bucket_id = '3d-models'` |
| `Public update for development` | UPDATE | `{public}` | `using: bucket_id = '3d-models'`, `with_check` **kosong** |

`PUBLIC` mencakup `anon`, dan kunci anon tertanam di bundel peramban setiap
pengunjung, jadi ini bukan celah teoretis: siapa pun di internet dapat
menitipkan berkas ke bucket `3d-models` dan menimpa baris metadata yang sudah
ada. `with_check` yang kosong pada UPDATE lebih buruk lagi — baris yang lolos
`using` boleh dipindahkan ke bucket **mana pun**, termasuk bucket privat.
Dibuktikan sebagai `anon` di transaksi yang di-rollback: `insert` berhasil,
`update` menyentuh 11 baris.

Seperti A99, ini temuan di luar batas Chatten — `storage.objects` milik instance
Supabase swakelola bersama, bukan skema `chatten_cafe`. Karena itu perbaikannya
ada di [`ops/storage-drop-public-write-dev.sql`](../ops/storage-drop-public-write-dev.sql),
bukan di `supabase/migrations/`.

**Pertanyaan yang menentukan** bukan "apakah kebijakan ini dipakai" melainkan
"apakah pengguna yang login punya jalur sah lain". Dijawab dengan menjatuhkan
kedua kebijakan di dalam transaksi yang di-rollback lalu menulis sebagai
masing-masing peran:

```
ANON insert TANPA kebijakan publik: ditolak (42501) — celah tertutup
AUTH insert TANPA kebijakan publik: BERHASIL (jalur sah utuh)
AUTH update TANPA kebijakan publik: 11 baris
```

Jalur sahnya berasal dari kebijakan tenant sendiri — `Authenticated users can
upload/update/delete 3D models`. Satu jebakan halus di sini: kolom `roles`
ketiga kebijakan itu **juga** `{public}`, sehingga sekilas tampak sama
longgarnya dengan yang dicabut. Yang membedakan bukan perannya melainkan
ekspresinya, `auth.role() = 'authenticated'`, yang menolak `anon` di dalam
kebijakan itu sendiri. Membaca kolom `roles` saja akan menghasilkan kesimpulan
yang salah.

**Setelah diterapkan**, diverifikasi lewat HTTP dengan kunci anon sungguhan:

- `POST /storage/v1/object/3d-models/probe/anon-*.glb` → **400**,
  `{"statusCode":"403","message":"new row violates row-level security policy"}`
- `GET /object/public/3d-models/Erik%20Thohir.glb` → **200** (galeri 3D publik
  tenant tetap tampil; 12 kebijakan SELECT tidak disentuh)
- `POST /object/list/{article,avatars,gallery,blog-covers}` → **200** dengan isi,
  jadi A99 tidak mengalami regresi
- 11 objek di `3d-models` utuh; delapan halaman publik Chatten 200

Pemulihan satu perintah, bila ternyata ada alur yang bergantung padanya, dicatat
di kepala berkas SQL-nya.

## Migration process note

`20260910000100_event_promotion_ordering.sql` created a unique index over a
column defaulting to `0`, which would raise `23505` on the second insert; it was
reverted by `…000200`. Net effect is zero, but intermediate migration steps must
never leave a unique index over a non-unique default — squash such pairs before
shipping.
