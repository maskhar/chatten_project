-- Audit remediation A50, A51, A53, A54, A55, A56, A63, A64.
--
-- Verified against the live self-hosted instance on 2026-09-21 before writing:
-- zero orphan rows across all ten media-referencing columns, so every foreign
-- key below validates without a data repair first.

-- A50: image_media_id and og_media_id were declared as bare `uuid` in
-- 20260909000100_initial_chatten_cafe.sql. Referential integrity has been
-- application-layer only, which means a deleted media row leaves every piece
-- of content that pointed at it holding a dangling id that resolves to
-- nothing at render time. `on delete set null` matches what the readers
-- already expect: `MediaImage` treats a null media as "no image".
alter table chatten_cafe.hero_slides
  add constraint hero_slides_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.moments
  add constraint moments_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.about_sections
  add constraint about_sections_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.experiences
  add constraint experiences_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.spaces
  add constraint spaces_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.menu_items
  add constraint menu_items_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.gallery_items
  add constraint gallery_items_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.seo_settings
  add constraint seo_settings_og_media_id_fkey
  foreign key (og_media_id) references chatten_cafe.media(id) on delete set null;

-- A51: 20260909000600_add_event_promotion_media.sql intended to add these two
-- columns *with* their foreign key, but both columns already existed from the
-- initial migration. `add column if not exists` skips the entire clause when
-- the column is present — `references` included — so it ran green and added
-- nothing. The indexes in that file did land, because `create index if not
-- exists` is a separate statement. Only the constraints are missing.
alter table chatten_cafe.events
  add constraint events_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

alter table chatten_cafe.promotions
  add constraint promotions_image_media_id_fkey
  foreign key (image_media_id) references chatten_cafe.media(id) on delete set null;

-- A50 continued: the eight columns above have no index on the referencing
-- side. Postgres does not create one for a foreign key, and without it every
-- `delete from media` scans all eight tables to enforce `on delete set null`.
-- Partial, because the overwhelming majority of rows have no image.
create index if not exists hero_slides_image_media_id_idx on chatten_cafe.hero_slides(image_media_id) where image_media_id is not null;
create index if not exists moments_image_media_id_idx on chatten_cafe.moments(image_media_id) where image_media_id is not null;
create index if not exists about_sections_image_media_id_idx on chatten_cafe.about_sections(image_media_id) where image_media_id is not null;
create index if not exists experiences_image_media_id_idx on chatten_cafe.experiences(image_media_id) where image_media_id is not null;
create index if not exists spaces_image_media_id_idx on chatten_cafe.spaces(image_media_id) where image_media_id is not null;
create index if not exists menu_items_image_media_id_idx on chatten_cafe.menu_items(image_media_id) where image_media_id is not null;
create index if not exists gallery_items_image_media_id_idx on chatten_cafe.gallery_items(image_media_id) where image_media_id is not null;
create index if not exists seo_settings_og_media_id_idx on chatten_cafe.seo_settings(og_media_id) where og_media_id is not null;

-- A56: menu_items.category_id is the one pre-existing foreign key that is
-- filtered on every menu render, reorder and category-delete guard, and it had
-- no index either — only the primary key and the slug unique. Not partial:
-- the column is `not null`.
create index if not exists menu_items_category_id_idx on chatten_cafe.menu_items(category_id);

-- A64: every public list query filters `is_active = true and status =
-- 'published'` and orders by sort_order (events by starts_at). A partial index
-- on exactly that predicate keeps only the visible rows, so the index stays
-- small as drafts accumulate and the ordering is read straight from it.
create index if not exists hero_slides_public_idx on chatten_cafe.hero_slides(sort_order) where is_active and status = 'published';
create index if not exists moments_public_idx on chatten_cafe.moments(sort_order) where is_active and status = 'published';
create index if not exists about_sections_public_idx on chatten_cafe.about_sections(sort_order) where is_active and status = 'published';
create index if not exists experiences_public_idx on chatten_cafe.experiences(sort_order) where is_active and status = 'published';
create index if not exists spaces_public_idx on chatten_cafe.spaces(sort_order) where is_active and status = 'published';
create index if not exists menu_items_public_idx on chatten_cafe.menu_items(sort_order) where is_active and status = 'published';
create index if not exists gallery_items_public_idx on chatten_cafe.gallery_items(sort_order) where is_active and status = 'published';
create index if not exists testimonials_public_idx on chatten_cafe.testimonials(sort_order) where is_active and status = 'published';
create index if not exists events_public_idx on chatten_cafe.events(starts_at) where is_active and status = 'published';
create index if not exists promotions_public_idx on chatten_cafe.promotions(created_at) where is_active and status = 'published';

-- A55: profiles carries `own_profile` (SELECT) and `profile_manage` (ALL, admin
-- only). There is no INSERT path for a user's own row. It works today only
-- because handle_new_user is SECURITY DEFINER and runs as the function owner,
-- bypassing RLS entirely. That is a single undocumented dependency: the day
-- anything inserts a profile through the normal client — a repair script, a
-- self-service signup, a trigger rewritten without SECURITY DEFINER — it fails
-- with a policy violation and no obvious cause. The policy makes the intent
-- explicit, and `with check` keeps it to the caller's own row.
create policy own_profile_insert on chatten_cafe.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- A53: pg_default_acl for this schema grants only service_role. Every table so
-- far was granted to anon/authenticated by hand in the initial migration, so a
-- table added later is readable by service_role and invisible to everyone
-- else — RLS policies included, because a policy cannot grant a privilege the
-- role was never given. The symptom is an empty public page with no error.
--
-- This grants the SQL-level privilege only. RLS still decides which rows come
-- back, and a new table with RLS enabled and no policy still returns nothing.
alter default privileges in schema chatten_cafe grant select on tables to anon, authenticated;
alter default privileges in schema chatten_cafe grant insert, update, delete on tables to authenticated;
alter default privileges in schema chatten_cafe grant usage, select on sequences to anon, authenticated;

-- A63: opening_hours accepted states the UI cannot render. A closed day with
-- times set, an open day with no times, and a closes_at at or before opens_at
-- were all storable. app/(public)/page.tsx renders `opens_at – closes_at` with
-- an em-dash fallback per side, so a half-filled row shows "08:00 – —" to a
-- visitor. Constrain it at the source instead.
--
-- Rows on the live instance were verified first: seven rows, all 08:00–22:00
-- and is_closed = false, so this validates without a repair.
alter table chatten_cafe.opening_hours
  add constraint opening_hours_times_consistent check (
    case
      when is_closed then opens_at is null and closes_at is null
      else opens_at is not null and closes_at is not null and closes_at > opens_at
    end
  );

-- A54: every table already had `relrowsecurity`, but none had
-- `relforcerowsecurity`, so policies did not apply to the table owner.
--
-- Checked before applying: the owner is `postgres`, which carries BYPASSRLS,
-- as does `service_role`. Both therefore bypass RLS regardless of this
-- setting, so nothing about the application's current access changes. What it
-- buys is the case this does not cover today — ownership moving to a role
-- without BYPASSRLS, or a SECURITY DEFINER function owned by a non-superuser
-- reading these tables — where today the policies would be silently skipped.
alter table chatten_cafe.site_settings force row level security;
alter table chatten_cafe.hero_slides force row level security;
alter table chatten_cafe.moments force row level security;
alter table chatten_cafe.about_sections force row level security;
alter table chatten_cafe.experiences force row level security;
alter table chatten_cafe.spaces force row level security;
alter table chatten_cafe.menu_categories force row level security;
alter table chatten_cafe.menu_items force row level security;
alter table chatten_cafe.gallery_items force row level security;
alter table chatten_cafe.testimonials force row level security;
alter table chatten_cafe.promotions force row level security;
alter table chatten_cafe.events force row level security;
alter table chatten_cafe.opening_hours force row level security;
alter table chatten_cafe.contact_information force row level security;
alter table chatten_cafe.social_links force row level security;
alter table chatten_cafe.navigation_items force row level security;
alter table chatten_cafe.media force row level security;
alter table chatten_cafe.profiles force row level security;
alter table chatten_cafe.user_roles force row level security;
alter table chatten_cafe.seo_settings force row level security;
alter table chatten_cafe.homepage_sections force row level security;
