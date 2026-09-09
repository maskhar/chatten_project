# Deployment

Build application image with `docker compose build`. Supply runtime environment through an ignored `.env` file on the deployment host; never bake `.env.local` into the image. Start only Chatten application services and preserve existing self-hosted Supabase volumes and services.

The application exposes `/api/health` for liveness and `/api/ready` for Supabase readiness. Docker healthchecks use the liveness endpoint. Before deployment, set `NEXT_PUBLIC_APP_URL`, browser-safe Supabase URL/key, and server-only service role key. No authorized Chatten application deployment host or production domain is configured in this repository.
