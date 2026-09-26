-- Remove the media rights-approval gate.
--
-- rights_status was introduced by 20260909000500 and turned into a publishing
-- gate by 20260921000100 (public_media) and 20260921000200 (storage read).
-- The premise was a shared photo library where provenance has to be cleared
-- before an asset can be published. Chatten runs a single-cafe landing page
-- edited by the people who took the photos: the gate only ever stood between
-- an operator and the image they had just uploaded, and nothing on screen
-- explained why the upload would not appear. Removing it is the decision that
-- an uploaded image is, by that act, publishable.
--
-- What is NOT removed: the bucket stays private and bytes keep going through
-- app/api/media/[id], so storage paths are still not guessable from outside.
-- That layer costs the operator nothing — it has no step, no field, no button.

-- The policies must go before the column they read, or the drop is refused.
drop policy if exists public_media on chatten_cafe.media;
create policy public_media on chatten_cafe.media
  for select
  using (true);

drop policy if exists "chatten public read" on storage.objects;
create policy "chatten public read" on storage.objects
  for select
  using (bucket_id = 'chatten-media');

alter table chatten_cafe.media drop column if exists rights_status;

-- Alt text becomes optional everywhere, gallery included. A gallery row with
-- no alt text falls back to its own caption when rendered, so the column no
-- longer has to be filled before an image can be saved.
alter table chatten_cafe.gallery_items alter column alt_text drop not null;
