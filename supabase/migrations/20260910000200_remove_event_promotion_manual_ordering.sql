drop index if exists chatten_cafe.events_sort_order_idx;
drop index if exists chatten_cafe.promotions_sort_order_idx;
alter table chatten_cafe.events drop column if exists sort_order;
alter table chatten_cafe.promotions drop column if exists sort_order;
