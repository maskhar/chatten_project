# Chatten Cafe

Next.js 16 App Router platform for Chatten Cafe, backed by self-hosted Supabase.

## Setup
1. Copy `.env.example` to `.env` and supply self-hosted Supabase URL, anon key, and server-only service role key.
2. Run `npm install`, `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm run build`.
3. Run `docker compose build` for application image.

Apply `supabase/migrations/` through controlled access to existing self-hosted Supabase PostgreSQL, then apply `supabase/seed/phase1.sql` only in appropriate non-production environments. Do not use Supabase Cloud or commit credentials. Documentation: `docs/PRD.md`, `docs/SDD.md`, `docs/TODO.md`.

Homepage content comes from `chatten_cafe` through public RLS-safe server queries. Uploading CMS media later uses `chatten-media`; no remote image host is required for Phase 2.

Public pages: `/menu`, `/experience`, `/spaces`, `/gallery`, `/events`, `/about`, and `/visit`. Set `NEXT_PUBLIC_APP_URL` for production canonical URLs, sitemap entries, robots sitemap reference, and social preview URLs.

CMS routes live under `/admin`. Create a Supabase Auth user, then assign its initial `super_admin` role through controlled database administration before signing in. CMS media uses the self-hosted `chatten-media` bucket; never expose the service-role key to browser code.

For a safer first role assignment, run `npm run admin:bootstrap -- --email user@example.com` or `npm run admin:bootstrap -- --user-id uuid` using ignored server runtime configuration. Node 24 uses the operating-system CA store for self-hosted Supabase TLS (`--use-system-ca` locally and `NODE_USE_SYSTEM_CA=1` in the production container). See `docs/BACKUP_RESTORE.md`, `docs/DEPLOYMENT.md`, and `docs/RELEASE_CHECKLIST.md` for release operations.


Media imports use the approved manifest at content/chatten-media-import.json. Run 
pm run media:import -- --manifest content/chatten-media-import.json --dry-run before importing. Only approved rights-status items import into self-hosted Supabase Storage; do not use Google Maps or third-party URLs as permanent assets. See docs/MEDIA_WORKFLOW.md.
