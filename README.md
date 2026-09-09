# Chatten Cafe

Next.js 16 App Router platform for Chatten Cafe, backed by self-hosted Supabase.

## Setup
1. Copy `.env.example` to `.env` and supply self-hosted Supabase URL, anon key, and server-only service role key.
2. Run `npm install`, `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm run build`.
3. Run `docker compose build` for application image.

Apply `supabase/migrations/` through controlled access to existing self-hosted Supabase PostgreSQL, then apply `supabase/seed/phase1.sql` only in appropriate non-production environments. Do not use Supabase Cloud or commit credentials. Documentation: `docs/PRD.md`, `docs/SDD.md`, `docs/TODO.md`.

Homepage content comes from `chatten_cafe` through public RLS-safe server queries. Uploading CMS media later uses `chatten-media`; no remote image host is required for Phase 2.
