create schema if not exists chatten_cafe;

create table if not exists chatten_cafe.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key in ('hero','moments','about','menu','spaces','experiences','feature','gallery','testimonials','visit')),
  sort_order integer not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists homepage_sections_sort_order_key on chatten_cafe.homepage_sections(sort_order);
drop trigger if exists set_updated_at on chatten_cafe.homepage_sections;
create trigger set_updated_at before update on chatten_cafe.homepage_sections for each row execute procedure chatten_cafe.set_updated_at();
alter table chatten_cafe.homepage_sections enable row level security;
drop policy if exists public_homepage_sections on chatten_cafe.homepage_sections;
create policy public_homepage_sections on chatten_cafe.homepage_sections for select using (is_visible);
drop policy if exists cms_manage_homepage_sections on chatten_cafe.homepage_sections;
create policy cms_manage_homepage_sections on chatten_cafe.homepage_sections for all to authenticated using (chatten_cafe.has_role('editor')) with check (chatten_cafe.has_role('editor'));
grant usage on schema chatten_cafe to anon, authenticated, service_role;
grant select on chatten_cafe.homepage_sections to anon;
grant select, insert, update, delete on chatten_cafe.homepage_sections to authenticated;
grant all on chatten_cafe.homepage_sections to service_role;

insert into chatten_cafe.homepage_sections(section_key, sort_order, is_visible) values
  ('hero', 0, true), ('moments', 1, true), ('about', 2, true), ('menu', 3, true), ('spaces', 4, true), ('experiences', 5, true), ('feature', 6, true), ('gallery', 7, true), ('testimonials', 8, true), ('visit', 9, true)
on conflict (section_key) do nothing;
