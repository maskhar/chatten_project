-- Audit remediation A79.
--
-- chatten_cafe.homepage_sections carried an immediate unique index on
-- sort_order. chatten_cafe.reorder_rows applies a whole permutation in one
-- UPDATE ... FROM, and Postgres checks a unique *index* per row as the
-- statement writes it, not once at the end. Any permutation that is not the
-- identity therefore transiently collides — row 2 takes rank 0 while row 1
-- still holds it — and the statement aborts with 23505. Every homepage reorder
-- failed: the CMS surfaced "Unable to save order" and the list reverted.
--
-- A deferrable constraint moves the check to transaction end, where the final
-- state is a clean 0..n permutation. Sort_order stays unique — nothing is
-- relaxed — it is only verified at the moment that answer is meaningful.
--
-- Note this must be a CONSTRAINT, not an index: only constraints can be
-- deferred. The name is kept so operators recognise it across the change.
drop index if exists chatten_cafe.homepage_sections_sort_order_key;

alter table chatten_cafe.homepage_sections
  drop constraint if exists homepage_sections_sort_order_key;

alter table chatten_cafe.homepage_sections
  add constraint homepage_sections_sort_order_key
  unique (sort_order)
  deferrable initially deferred;

-- The allowlist in the A58 function still names events and promotions, but
-- 20260910000200 dropped sort_order from both tables — calling reorder_rows on
-- either raises 42703 from inside a dynamic statement, which the CMS reports
-- as a generic save failure. Recreated here without them so the function, the
-- TypeScript mirror in lib/admin/reorder-core.ts, and the actual schema agree.
--
-- Everything else about the function is deliberate and unchanged: SECURITY
-- INVOKER so cms_manage still decides who may write (a DEFINER function would
-- run as the owner and let any authenticated caller reorder), the fixed
-- allowlist so format(%I) cannot be pointed at user_roles, the duplicate-id
-- check, and the affected-row count the caller compares against its own list.
create or replace function chatten_cafe.reorder_rows(
  target_table text,
  ids uuid[],
  start_offset integer default 0
) returns integer
language plpgsql
security invoker
set search_path = chatten_cafe, pg_temp
as $$
declare
  affected integer;
begin
  if target_table not in (
    'hero_slides','moments','about_sections','experiences','spaces',
    'menu_categories','menu_items','gallery_items','testimonials',
    'social_links','navigation_items','homepage_sections'
  ) then
    raise exception 'Table % is not reorderable', target_table using errcode = '42501';
  end if;

  if ids is null or array_length(ids, 1) is null then
    return 0;
  end if;

  -- array_length counts every element; a duplicate id would make two
  -- positions fight over one row and silently drop an entry from the order.
  if array_length(ids, 1) <> (select count(distinct id) from unnest(ids) as id) then
    raise exception 'Reorder list contains duplicate ids' using errcode = '22023';
  end if;

  execute format(
    'update chatten_cafe.%I as t set sort_order = v.position + $2, updated_at = now()
     from (select id, (ordinality - 1)::integer as position from unnest($1) with ordinality as u(id, ordinality)) as v
     where t.id = v.id',
    target_table
  ) using ids, start_offset;

  get diagnostics affected = row_count;
  return affected;
end $$;

revoke all on function chatten_cafe.reorder_rows(text, uuid[], integer) from public;
grant execute on function chatten_cafe.reorder_rows(text, uuid[], integer) to authenticated;
