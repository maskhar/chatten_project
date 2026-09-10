alter table chatten_cafe.events add column if not exists sort_order integer not null default 0;
alter table chatten_cafe.promotions add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (order by starts_at asc, created_at asc, id asc) - 1 as position
  from chatten_cafe.events
)
update chatten_cafe.events set sort_order = ranked.position from ranked where events.id = ranked.id;

with ranked as (
  select id, row_number() over (order by created_at asc, id asc) - 1 as position
  from chatten_cafe.promotions
)
update chatten_cafe.promotions set sort_order = ranked.position from ranked where promotions.id = ranked.id;

create unique index if not exists events_sort_order_idx on chatten_cafe.events(sort_order);
create unique index if not exists promotions_sort_order_idx on chatten_cafe.promotions(sort_order);
