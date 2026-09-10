# Media Workflow

Chatten imagery enters through operator-approved local files or explicitly approved HTTPS sources. Google Maps, Instagram, press, and other public image URLs are discovery references only unless reuse rights are explicitly approved.

## Import

1. Add approved items to `content/chatten-media-import.json`.
2. Set `rights_status` to `approved`, source metadata, category, title, and alt text.
3. Dry run:

```powershell
npm run media:import -- --manifest content/chatten-media-import.json --dry-run
```

4. Import approved items:

```powershell
npm run media:import -- --manifest content/chatten-media-import.json
```

Importer validates image signatures, MIME, size, SHA-256 duplicates, and writes to `chatten-media/site/<category>/`. It never prints credentials. Imported assets retain source and rights metadata.

## CMS

Media Library shows Storage thumbnails, dimensions, size, rights state, and usage count. New operator uploads start as `Unknown`; approve them only after rights review. Referenced media cannot be deleted until content references are replaced.

## Ownership

`chatten_cafe.media` is the durable metadata record. Content stores `image_media_id`; one asset may serve Hero, Moments, Gallery, Spaces, Experiences, or other content. SEO stores its Open Graph reference in `og_media_id`. `approved` is required before publishing workflows should assign new external/imported assets.

## Picker

Editorial modules with `image_media_id` use shared visual picker. Picker queries only approved assets, shows thumbnail/title/alt/category, and supports replace/remove without URL or UUID entry.

## Structured Usage Core

`lib/media/usage.ts` provides pure structured Media usage aggregation for CMS content and SEO `og_media_id` references. Database batching and Media Library UI wiring remain next steps.
