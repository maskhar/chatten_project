# System Design

```mermaid
flowchart LR
  Browser --> Next[Next.js App Router]
  Next --> API[Self-hosted Supabase API]
  API --> DB[(PostgreSQL: chatten_cafe)]
  API --> Storage[chatten-media]
```

Next.js Server Components default. Browser client uses anon key; server client uses cookie-backed auth; service-role client is server-only. Application tables live in `chatten_cafe`, inside existing self-hosted Supabase PostgreSQL. `updated_at` uses shared trigger. `price numeric(10,2)` stores currency units.

RLS permits anonymous reads only for active/published content. CMS mutations require `editor`, `admin`, or `super_admin`; user/role management requires `admin` or `super_admin`. Auth trigger creates profiles. Initial admin role bootstrap must occur through controlled database administration after Auth user creation.

`chatten-media` is public for future published web assets; sensitive assets require separate private bucket in later phase. PostgREST exposes `chatten_cafe` through `PGRST_DB_SCHEMAS`. Docker runs standalone Next.js separately from existing Supabase. Migrations remain source of truth. Risks: generated database types and full CMS controls remain Phase 4 work.
