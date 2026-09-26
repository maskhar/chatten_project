# Deployment

Build application image with `docker compose build`. Runtime configuration loads from the ignored `.env.local` file through `env_file`; Docker does not copy it into the image. Start only Chatten application services and preserve existing self-hosted Supabase volumes and services.

Default host port is `3010`, because `3000`, `3001` and `3002` are all taken by other projects on this host. Override with `APP_PORT`, for example `APP_PORT=3020 docker compose up -d`.

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so they must be present at **build** time — the compose `env_file` only reaches runtime. Always build through the env file:

```bash
docker compose --env-file .env.local build
```

The application joins five Docker networks: `carubra-network`, `buzzerhood-network`, `epochstream-network`, `soundpub-network`, and `maskhar-network`. All five are declared `external: true` and are **not** owned by this compose file — they already exist on the host and are shared with unrelated projects (`carubra-network` alone carries 30+ containers). Create a missing one explicitly before `up`:

```bash
docker network create carubra-network
```

Without `external: true`, compose would claim a shared network and `docker compose down` would try to remove it out from under every other container attached to it.

The application exposes `/api/health` for liveness and `/api/ready` for Supabase readiness. Docker healthchecks use the liveness endpoint. Set `NEXT_PUBLIC_APP_URL`, browser-safe Supabase URL/key, and server-only service role key in `.env.local`. No authorized Chatten application deployment host or production domain is configured in this repository.

## `NEXT_PUBLIC_APP_URL` is required at build time (audit item A47)

`next build` fails when `NEXT_PUBLIC_APP_URL` is unset. It is the only source
of the site's absolute origin: without it `lib/seo.ts` drops `metadataBase`,
the canonical link and the Open Graph URL, `app/sitemap.ts` returns an empty
sitemap, `app/robots.ts` omits its `Sitemap:` line, and the JSON-LD carries no
`url`. The site still builds and serves — it is simply invisible to crawlers,
with nothing in the logs to say why. `lib/env/app-url.ts` turns that into a
build error instead.

- A value that is not an absolute `http`/`https` URL fails in every
  environment: that is a typo, and `new URL()` would throw per request.
- `http://localhost:3000` only warns. A local `npm run build` is also
  `NODE_ENV=production`, and localhost is the right answer there.
- `ALLOW_MISSING_APP_URL=1 npm run build` builds without it, for a CI step
  that only needs to know the code compiles.

## The Chatwoot widget is configured at build time

The live-chat widget is optional and driven by two variables, which must be set
together or not at all:

```
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://chatwoot.example.com
NEXT_PUBLIC_CHATWOOT_TOKEN=<inbox website token>
```

Setting only one fails the build rather than shipping a chat bubble that never
appears; `lib/env/chatwoot.ts` holds that check and `next.config.ts` runs it.

Both are `NEXT_PUBLIC_*`, so — exactly like the Supabase pair — they are
compiled into the browser bundle and must be present **at image build time**.
`docker compose --env-file .env.local build` passes them through; the compose
`env_file` alone only reaches runtime and cannot patch a built bundle. The
website token is public by design: it appears in the page source of every site
running the widget and only identifies which inbox a message lands in.

The values also decide the CSP the runtime serves. `next.config.ts` adds the
Chatwoot origin to `script-src` (the SDK), `frame-src` (the widget iframe),
`connect-src` (its API plus the `wss://…/cable` websocket — a separate origin
to a CSP), `img-src` and `style-src`. Build without them and the policy stays
exactly as it was. Build the image against one Chatwoot origin and point it at
another at runtime, and the browser will block the widget.

## Database types are generated, not hand-written (audit item A52)

`types/database.ts` is generated from the live `chatten_cafe` schema and must
not be edited by hand. It was previously a placeholder that typed every table
as `Record<string, unknown>`, which meant supabase-js accepted any table name
and any column — a query naming a column the schema did not have compiled
cleanly and failed only at runtime. That is the root cause that let audit item
A1 ship.

```bash
npm run types:generate
```

```bash
npm run types:check
```

`types:check` regenerates and compares, exiting non-zero when the committed
file is stale. Run it in CI after `typecheck`; a schema change that is not
reflected in the committed types fails the build instead of surfacing as a
runtime PostgREST error.

Both commands need SSH access to the Supabase host. They read from the
`supabase-meta` container already running there (`GET
/generators/typescript`) rather than through `supabase gen types`, which
would need Postgres published on the host, an SSH tunnel, a local Docker
image pull, and the database password on a command line. Override the target
with `SUPABASE_SSH_HOST` and `SUPABASE_DOCKER_DIR` if either moves.

Derived helpers live in `types/tables.ts`, not in the generated file, so the
generated output stays byte-identical to what the generator emits. Use
`TableName` for any helper that takes a table name: typing one as `string`
makes supabase-js fall through to its `(relation: never)` overload, which
silently disables column checking for the whole chain. `lib/supabase/dynamic.ts`
is the single sanctioned exception, for the generic CMS actions that resolve
their table at runtime — it relaxes the column types but still constrains the
table name.

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