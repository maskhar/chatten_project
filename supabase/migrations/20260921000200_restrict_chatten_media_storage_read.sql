-- Audit remediation A6.
--
-- "chatten public read" on storage.objects allowed
--   using (bucket_id = 'chatten-media')
-- with no rights_status condition, on a public = true bucket. Verified
-- 2026-09-21: an object whose chatten_cafe.media row has
-- rights_status = 'unknown' (the app's own "not cleared to publish" state)
-- was fully downloadable via the anonymous
-- /storage/v1/object/public/chatten-media/<path> endpoint — the exact
-- exposure this ticket describes. Join the policy to chatten_cafe.media so
-- only rows the app itself treats as publishable are servable, matching the
-- public_media policy already applied to chatten_cafe.media
-- (20260921000100). "chatten cms manage" is untouched: editors/admins keep
-- full read/write over every object regardless of rights_status.
drop policy "chatten public read" on storage.objects;

create policy "chatten public read" on storage.objects
  for select
  using (
    bucket_id = 'chatten-media'
    and exists (
      select 1
      from chatten_cafe.media m
      where m.storage_path = storage.objects.name
        and m.bucket = storage.objects.bucket_id
        and m.rights_status = 'approved'
    )
  );
