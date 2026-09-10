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

`chatten_cafe.media` is durable metadata. Content stores `image_media_id`; SEO stores Open Graph reference in `og_media_id`. `approved` is required before publishing workflows should assign new external/imported assets.

## Picker

Editorial modules with `image_media_id` use the shared visual Media Picker component (`components/admin/media-picker.tsx`). The Picker queries only `rights_status: approved` assets from the server, ensuring Needs Review and Restricted images are never selectable for publishable content. Operators search by title, alt text, or category; filter by category dropdown; and combine search + category with AND logic. Selected images show explicit **Selected** indicator text with visual ring styling. Replace and Remove actions clear selection without requiring UUID entry. Zero approved images shows **No approved images yet** with a direct **Open Media Library** link, guiding operators to upload and approve assets. Filtered empty state shows **No images match your filters** with inline **Clear filters** action. The workflow enforces: Upload → Needs Review → Approve → Select through Media Picker.

## Structured Usage Core

`lib/media/usage.ts` provides pure structured Media usage aggregation for CMS content and SEO `og_media_id` references.

## Structured Usage Database Wiring

`lib/media/usage-server.ts` loads batched, read-only resource rows through the server Supabase client and feeds them once into `buildMediaUsageMap`. It performs no per-Media N+1 queries. Media Library counts and deletion safety derive from structured reference arrays. SEO selects `og_media_id`; Media Detail `Used In` UI remains next step.

## Human-readable Delete Protection

Media deletion rechecks current structured references on server immediately before Storage removal. Referenced Media is rejected with human-readable usage count and the same resource/title context shown by Media Detail `Used In`, including SEO through `og_media_id`. Unused Media keeps exact Storage-object removal followed by exact database-row deletion.

## Multi-file Upload Core

`lib/media/upload-core.ts` processes up to 20 selected images sequentially and independently. Each file receives server-side signature validation, a 10 MB per-file limit, SHA-256 duplicate detection, and an individual result, so invalid or failed files do not roll back valid siblings. Normal uploads always create `operator-upload` Media records with `rights_status: unknown` (`Needs Review`); client-supplied rights are ignored. Storage upload must succeed before Media insertion, and a failed insertion attempts removal of the exact uploaded Storage object. Multi-file selection, Drag & Drop, and per-file queue UI wiring are complete.
