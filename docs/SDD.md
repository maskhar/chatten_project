# System Design

```mermaid
flowchart LR
  Browser --> Next[Next.js App Router]
  Next --> API[Self-hosted Supabase API]
  API --> DB[(PostgreSQL: chatten_cafe)]
  API --> Storage[chatten-media]
```

Next.js Server Components default. Browser client uses anon key; server client uses cookie-backed auth; service-role client is server-only. Application tables live in `chatten_cafe`, inside existing self-hosted Supabase PostgreSQL. `updated_at` uses shared trigger. `price numeric(10,2)` stores currency units.

RLS permits anonymous reads only for active/published content. CMS mutations require `editor`, `admin`, or `super_admin`; user/role management requires `admin` or `super_admin`. Auth trigger creates profiles. Initial admin role bootstrap must occur through controlled database administration after Auth user creation.

### Deleting the last super_admin (audit item A65)

`auth.users` → `chatten_cafe.profiles` → `chatten_cafe.user_roles` are chained
`on delete cascade`, and `prevent_last_super_admin_removal` is a row-level
trigger on `user_roles`. Deleting the last super_admin's **Auth user** therefore
does not fail at the Auth layer; it cascades into `user_roles`, the trigger
fires on the resulting DELETE, and `raise exception 'Cannot remove the last
super_admin'` aborts the whole cascade. The Auth user, the profile and the role
all survive, and the caller receives the raw Postgres exception — from the
Supabase Admin API that surfaces as an opaque database error, not as a
validation message naming the cause.

This is the intended outcome: the guard is deliberately placed where it cannot
be routed around, and a deferrable constraint trigger also catches a
delete-then-reinsert inside one transaction. Operationally it means **promote a
second super_admin before deleting the current one**. Nothing in the CMS deletes
Auth users today, so this is reachable only through direct database or Admin API
administration.

`chatten-media` is a private bucket. Reads go through the application route `/api/media/[id]`, which resolves the media row under the caller RLS session and streams the object with the server-only service-role client; the Supabase `object/public` route is closed (audit A6). PostgREST exposes `chatten_cafe` through `PGRST_DB_SCHEMAS`. Docker runs standalone Next.js separately from existing Supabase. Migrations remain source of truth. Risks: generated database types and full CMS controls remain Phase 4 work.

## Homepage data flow

Phase 2 homepage uses the normal server Supabase client and `chatten_cafe` RLS policies, never service-role access. It loads published/active entities for hero, moments, brand story, menu, spaces, experiences, gallery, testimonials, events/promotions, visit details, navigation, and social links. Missing rows render restrained placeholders or hide optional sections. Media records resolve to `/api/media/<id>` on the application origin. The homepage stays dynamic so runtime environment configuration is never required during the Docker build; explicit query caching can be added when CMS publishing workflows are introduced.

## Public routes and SEO

Phase 3 adds data-driven public routes for menu, experiences, spaces, gallery, events, about, and visit. Experience, space, and event slugs resolve through RLS-safe public queries and return the branded 404 page when absent. Shared public components provide header, footer, page hero, and consistent CTA patterns. Centralized public query and data types live in `lib/public-data`; this is the maintainable schema-derived type strategy until self-hosted type generation is operationalized.

Every public page supplies descriptive metadata. Canonical and sitemap absolute URLs require `NEXT_PUBLIC_APP_URL`; when it is absent, no placeholder domain is emitted. `robots.txt` excludes admin routes. A project-owned SVG provides default OG treatment, and root JSON-LD uses only verified `WebSite` identity fields. Public media is served through `/api/media/<id>` with branded placeholders for absent media.

## CMS architecture

Phase 4 adds an authenticated `/admin` dashboard. A protected route group keeps `/admin/login` public while all CMS modules require a valid Supabase Auth session plus a `chatten_cafe.user_roles` record. Shared resource definitions drive table allowlists and field forms for content/settings CRUD. Server actions use the regular cookie-backed Supabase client, preserving database RLS; the server-only service-role client is limited to listing Auth users after an authorized request reaches the Users & Roles module.

The media library uploads validated images (image MIME type, 10 MB maximum) into `chatten-media`, then records metadata in `chatten_cafe.media`. Deletes are confirmed in the browser and blocked when a media record is referenced by public content. Contact data now separates `directions_url` from `map_embed_url`; the old `map_url` value is retained and backfilled into directions for compatibility.

Initial role bootstrap remains an operational database-admin step: current self-hosted Auth users have no CMS roles, so no user can enter the dashboard until a controlled super-admin assignment is made. This intentionally avoids a development bypass.
## Media architecture`nApproved assets live in the private self-hosted Supabase Storage bucket chatten-media with metadata in chatten_cafe.media. Rights metadata, SHA-256 duplicate detection, and a reusable approved-only Media Picker keep content references durable. CMS forms store image_media_id; rendering resolves /api/media/<id> with branded fallbacks. New uploads remain unknown until operator approval.
