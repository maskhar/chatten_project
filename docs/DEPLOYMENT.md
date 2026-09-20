# Deployment

Build application image with `docker compose build`. Runtime configuration loads from the ignored `.env.local` file through `env_file`; Docker does not copy it into the image. Start only Chatten application services and preserve existing self-hosted Supabase volumes and services.

Default host port is `3002` because ports `3000` and `3001` are occupied in the current environment. Override with `APP_PORT` when needed, for example `APP_PORT=3010 docker compose up -d`.

The application joins these Docker networks: `carubra-network`, `buzzerhood-network`, `epochstream-network`, `soundpub-network`, and `maskhar-network`. Compose creates them as bridge networks when absent.

The application exposes `/api/health` for liveness and `/api/ready` for Supabase readiness. Docker healthchecks use the liveness endpoint. Set `NEXT_PUBLIC_APP_URL`, browser-safe Supabase URL/key, and server-only service role key in `.env.local`. No authorized Chatten application deployment host or production domain is configured in this repository.

## Auth brute-force protection (audit item A12)

`app/admin/login/login-form.tsx` posts credentials straight to GoTrue at
`/auth/v1/token`. Inspected 2026-09-21 on the self-hosted server: the
`supabase-auth` container runs with **no** `GOTRUE_RATE_LIMIT_*` variables
set, so only GoTrue's built-in defaults apply and admin sign-in has no
meaningful brute-force throttling.

This is **not yet configured**, deliberately. The Supabase instance at
`20.20.20.173` is shared infrastructure: `storage.buckets` holds 25 buckets
belonging to several unrelated applications, all of which authenticate
through the same `supabase-auth` container behind the same `supabase-kong`
gateway (host ports 8000/8443, no separate nginx/caddy/traefik in front).
Changing either component affects every tenant, and applying the change
requires restarting `supabase-auth`, which briefly interrupts sign-in for
all of them. That needs an owner-scheduled maintenance window, not an
incidental change from a Chatten deployment.

When that window is available, apply **one** of these:

1. **GoTrue-level (preferred, affects all tenants equally).** Add to the
   Supabase `.env` on the server, then `docker compose up -d auth`:

   ```
   GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For
   GOTRUE_RATE_LIMIT_EMAIL_SENT=10
   GOTRUE_RATE_LIMIT_TOKEN_REFRESH=30
   GOTRUE_RATE_LIMIT_VERIFY=30
   GOTRUE_RATE_LIMIT_OTP=30
   ```

   `GOTRUE_RATE_LIMIT_HEADER` matters: without it GoTrue buckets by the
   gateway's own address and rate-limits every tenant as a single client.

2. **Kong-level (scopeable to one route).** Add the `rate-limiting` plugin to
   the `auth-v1-open` / `auth-v1-open-authorize` routes in the Supabase
   `volumes/api/kong.yml`, then reload Kong. Use this if throttling must
   apply only to specific paths rather than all of GoTrue.

Verify afterwards by issuing repeated bad-password POSTs to
`/auth/v1/token?grant_type=password` and confirming a `429` appears, and by
signing in normally once to confirm legitimate auth still works for the
other applications on the host.