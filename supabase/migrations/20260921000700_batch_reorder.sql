-- Audit remediation A58.
--
-- Every reorder action issued one UPDATE per row, and several did it twice:
-- a staging pass writing sort_order = 100000 + index, then a second pass
-- writing the real values. Reordering twelve spaces was twenty-four round
-- trips, each its own transaction, so an interruption halfway left the list
-- in the staging range — visible to the public site as an arbitrary order.
--
-- This replaces all of it with one statement. `unnest` with ordinality turns
-- the id array into (id, position) pairs and a single UPDATE ... FROM applies
-- them, so the whole reorder is atomic and the intermediate state never
-- exists. The staging pass is not needed at all: no reorderable table has a
-- unique constraint on sort_order (opening_hours is unique on
-- (day_of_week, sort_order), and its day_of_week does not change here).
--
-- SECURITY INVOKER, deliberately. A SECURITY DEFINER function would run as
-- the owner and bypass the RLS policies that decide who may write these
-- tables — the reorder would then succeed for any authenticated caller who
-- could reach the endpoint. As invoker, cms_manage still applies and an
-- editor without permission updates zero rows.
--
-- The table name is checked against a fixed allowlist rather than
-- interpolated blind: `format(%I)` quotes an identifier safely but would
-- still happily target any table in the schema, including user_roles.
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
    'promotions','events','social_links','navigation_items','homepage_sections'
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

-- Callable by the CMS session. RLS on the target table still decides whether
-- any row is actually updated.
revoke all on function chatten_cafe.reorder_rows(text, uuid[], integer) from public;
grant execute on function chatten_cafe.reorder_rows(text, uuid[], integer) to authenticated;
