alter table chatten_cafe.events add column if not exists image_media_id uuid references chatten_cafe.media(id) on delete set null;
alter table chatten_cafe.promotions add column if not exists image_media_id uuid references chatten_cafe.media(id) on delete set null;
create index if not exists events_image_media_id_idx on chatten_cafe.events(image_media_id) where image_media_id is not null;
create index if not exists promotions_image_media_id_idx on chatten_cafe.promotions(image_media_id) where image_media_id is not null;