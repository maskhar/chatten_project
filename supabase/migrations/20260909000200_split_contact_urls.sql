alter table chatten_cafe.contact_information add column if not exists directions_url text;
alter table chatten_cafe.contact_information add column if not exists map_embed_url text;
update chatten_cafe.contact_information set directions_url = coalesce(directions_url, map_url) where map_url is not null;
