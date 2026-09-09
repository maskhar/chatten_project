# Persistent Project Context

## Project Identity

* Project name: **Chatten Cafe Website & Management Dashboard**.
* This repository contains:

  * Public-facing Chatten Cafe website.
  * Management dashboard / CMS.
  * Database migrations and seed data.
  * Supabase integration.
  * Docker configuration.
  * Project documentation.
* The application must be designed as a production-ready system, not as a static prototype.
* Public website content must be manageable from the administration dashboard wherever defined as CMS-managed content.

---

# Core Technology Direction

Unless explicitly changed by the project owner, use:

* Next.js with App Router.
* TypeScript.
* Tailwind CSS.
* shadcn/ui where appropriate.
* PostgreSQL through self-hosted Supabase.
* Supabase Auth for authentication.
* Supabase Storage for media.
* Docker / Docker Compose for deployment.

Prefer:

* Server Components by default.
* Client Components only when browser interaction is required.
* Server-side data access for sensitive operations.
* Type-safe code.
* Reusable components.
* Explicit validation.
* Simple architecture over unnecessary abstraction.

Do not introduce another database, authentication provider, CMS, ORM, backend-as-a-service, or cloud dependency without explicit approval.

---

# Supabase Hosting

## Self-Hosted Only

* This project uses **self-hosted Supabase**.
* It does **not** use Supabase Cloud.
* Do not create or require a project on `supabase.com`.
* Do not assume Supabase CLI cloud deployment workflows are available.
* Do not introduce functionality that requires Supabase Cloud unless explicitly approved.

## Supabase Server

* SSH endpoint:

  `maskhar@20.20.20.173`

* SSH host alias:

  `maskhar@supabase-server`

* Supabase Docker directory:

  `~/docker/supabase/supabase-1.26.05/docker`

Before deploying, debugging, restarting, or modifying Supabase services:

1. Connect to the self-hosted server through SSH.

2. Change directory to:

   `~/docker/supabase/supabase-1.26.05/docker`

3. Inspect the currently running Docker Compose configuration before making infrastructure changes.

4. Preserve existing services, volumes, environment variables, secrets, and unrelated applications.

Do not assume the server configuration is identical to the default Supabase repository.

---

# Database Architecture

## Application Schema

The primary PostgreSQL schema for this application is:

`chatten_cafe`

All Chatten Cafe application-owned database objects should live inside this schema unless there is a specific technical reason not to.

Examples:

* `chatten_cafe.site_settings`
* `chatten_cafe.hero_slides`
* `chatten_cafe.moments`
* `chatten_cafe.menu_categories`
* `chatten_cafe.menu_items`
* `chatten_cafe.gallery_items`
* `chatten_cafe.events`
* `chatten_cafe.promotions`
* `chatten_cafe.opening_hours`
* `chatten_cafe.testimonials`
* `chatten_cafe.social_links`
* `chatten_cafe.navigation_items`
* `chatten_cafe.media`
* `chatten_cafe.profiles`
* `chatten_cafe.user_roles`

Do not put application tables in the PostgreSQL `public` schema by default.

Supabase-managed schemas such as the following must remain managed by Supabase:

* `auth`
* `storage`
* `realtime`
* `extensions`
* other Supabase internal schemas

Do not move, rename, recreate, or modify Supabase internal schemas unless explicitly required.

---

# Initial Database Bootstrap

The first database migration must create the application schema safely and idempotently.

Minimum requirement:

```sql
create schema if not exists chatten_cafe;
```

Do not manually create production database structures without also creating or updating the corresponding migration in the repository.

The repository migration history is the source of truth for Chatten Cafe-owned database structures.

Suggested location:

`supabase/migrations/`

Every structural database change must be reproducible from migrations.

Examples include:

* schema creation
* tables
* columns
* indexes
* constraints
* enums
* triggers
* PostgreSQL functions
* RLS policies
* privileges
* seed-related structural requirements

---

# Custom Schema and Supabase API

Because Chatten Cafe uses a custom PostgreSQL schema named `chatten_cafe`, verify that the self-hosted Supabase API / PostgREST configuration exposes this schema when browser or server Supabase clients need direct access to it.

Do not assume `chatten_cafe` is automatically exposed.

Before changing PostgREST configuration:

1. Inspect the current Docker Compose configuration.
2. Inspect the current PostgREST environment configuration.
3. Preserve all currently exposed schemas.
4. Add `chatten_cafe` without removing existing required schemas.
5. Restart or recreate only the required service.
6. Verify API access after the change.

Do not replace the existing PostgREST schema list blindly.

When using Supabase JS with the custom schema, use the appropriate schema-aware client access rather than assuming `public`.

Example conceptually:

```ts
supabase.schema("chatten_cafe")
```

Use the exact API supported by the installed Supabase JS version.

---

# Database Security

## Row Level Security

RLS must be considered mandatory for application data exposed through Supabase APIs.

Do not rely on frontend checks for authorization.

Public visitors should only receive information intentionally published for the public website.

Typical public rule:

* Anonymous users may read active/published public content.
* Anonymous users may not create, update, or delete CMS content.

Typical authenticated CMS rule:

* Authorized CMS users may perform operations according to their role.

Initial roles should support:

* `super_admin`
* `admin`
* `editor`

Role checks must ultimately be enforced server-side and/or through PostgreSQL policies.

Frontend role checks are for UI behavior only and are not security boundaries.

---

# Database Privileges

Do not solve permission problems by granting unrestricted database access to `anon` or `authenticated`.

Grant only permissions required by the application.

RLS and PostgreSQL privileges must work together.

Avoid broad statements such as:

```sql
grant all on all tables in schema chatten_cafe to anon;
```

unless explicitly justified and approved.

Never disable RLS globally as a workaround.

Never expose the Supabase service-role credential to browsers.

---

# PostgreSQL Conventions

Unless a specific entity requires otherwise:

* Use UUID primary keys.
* Prefer `gen_random_uuid()` where appropriate.
* Use `timestamptz` for timestamps.
* Store timestamps in UTC.
* Add `created_at`.
* Add `updated_at` where records are editable.
* Use foreign keys.
* Add useful indexes.
* Use explicit constraints.
* Prefer normalized relational data over uncontrolled JSON blobs.
* Use JSON/JSONB only where flexible structured data is genuinely appropriate.

CMS entities that need ordering should normally include:

* `sort_order`

CMS entities that can be hidden should normally include:

* `is_active`

Entities requiring editorial lifecycle may include:

* `status`

with values such as:

* `draft`
* `published`

Avoid implementing a generic page-builder database unless explicitly requested.

---

# Database Migration Safety

Before applying migrations to an existing server:

1. Inspect migration contents.
2. Determine whether the migration is destructive.
3. Preserve existing unrelated schemas and databases.
4. Take appropriate precautions for destructive changes.
5. Never drop a schema, table, column, database, or volume merely to make a migration succeed.

Never use:

```sql
drop schema public cascade;
```

Never use:

```sql
drop schema chatten_cafe cascade;
```

as a routine deployment strategy.

Production data must be treated as persistent.

---

# Supabase Authentication

Use Supabase Auth from the self-hosted Supabase installation.

The administration dashboard should use authenticated sessions.

Expected route:

`/admin/login`

Do not implement a custom password database when Supabase Auth already satisfies the requirement.

Application profile and authorization information may live in:

`chatten_cafe.profiles`

and/or:

`chatten_cafe.user_roles`

Do not modify Supabase Auth internal tables directly from application code.

Use supported Auth APIs and appropriate triggers/functions when synchronization with application profiles is needed.

---

# Supabase Storage

Use the self-hosted Supabase Storage service for CMS-managed media unless explicitly changed.

Typical media includes:

* hero images
* gallery images
* menu images
* event images
* promotion images
* OG images

Do not store uploaded binary image data directly in ordinary PostgreSQL application tables.

Store file metadata and references in the database where required.

Media records should support relevant metadata such as:

* filename
* storage path
* MIME type
* size
* width
* height
* alt text
* created timestamp

Never make sensitive/private storage buckets public merely to simplify development.

---

# Edge Function Deployment

Supabase Edge Functions, if used by this project, must be deployed to the self-hosted Supabase installation.

Do not use:

`supabase functions deploy`

for deployment to this project.

For every new or changed Edge Function:

1. Inspect Docker Compose volume mappings on:

   `maskhar@supabase-server`

2. Work from:

   `~/docker/supabase/supabase-1.26.05/docker`

3. Confirm the current remote Edge Function source volume before uploading.

The currently confirmed Edge Function volume source directory is:

`~/docker/supabase/supabase-1.26.05/docker/volumes/functions`

The currently confirmed Docker Compose service name is:

`functions`

Upload source using `scp`.

Upload only:

* the intended function directory
* required shared source files

Do not overwrite:

* unrelated functions
* remote `.env` files
* secrets
* runtime configuration
* unrelated volumes

After upload:

1. Perform the required Docker reload/recreate operation from the Supabase Docker directory.
2. Verify container health.
3. Inspect relevant logs if necessary.
4. Verify the actual function endpoint.

Do not introduce Edge Functions unnecessarily when ordinary Next.js server functionality is sufficient.

---

# Secret Management

Never commit secrets.

Never write secrets into:

* repository files
* documentation committed to Git
* source code
* browser bundles
* frontend environment variables
* test fixtures
* seed data
* chat memory

Examples of secrets include:

* SSH passwords
* SSH private keys
* PostgreSQL passwords
* Supabase JWT secrets
* Supabase service-role keys
* API secrets
* OAuth client secrets
* third-party credentials

Use environment variables.

Maintain a safe:

`.env.example`

containing variable names and non-sensitive examples/placeholders only.

Files containing actual credentials must remain excluded from Git.

---

# Environment Variables

Separate browser-safe variables from server-only variables.

Variables prefixed with:

`NEXT_PUBLIC_`

must be assumed readable by website visitors.

Never put secrets in `NEXT_PUBLIC_*`.

Possible browser-safe configuration may include:

* public application URL
* browser-safe Supabase API URL
* Supabase anonymous key where appropriate for standard Supabase architecture

Server-only credentials such as the service-role key must never have a `NEXT_PUBLIC_` prefix.

Validate required environment variables at application startup where practical.

---

# Docker-First Deployment

The Chatten Cafe application must be deployable with Docker.

The deployment architecture should support:

* Next.js application container
* existing self-hosted Supabase infrastructure
* persistent PostgreSQL storage
* persistent Supabase Storage data
* restart-safe application behavior
* environment-based configuration

Do not make production deployment depend on:

* Vercel
* Netlify
* Supabase Cloud
* another mandatory cloud platform

unless explicitly approved.

The Next.js application should support a production Docker build.

Prefer multi-stage Docker builds.

Production containers must not run development servers.

---

# Persistent Data

Treat these as persistent infrastructure data:

* PostgreSQL database data
* Supabase Storage objects
* Supabase configuration/secrets
* required application uploads

Never run destructive Docker commands against persistent volumes without explicit approval and a clear reason.

Avoid commands such as:

`docker compose down -v`

on production or shared infrastructure.

A normal application deployment must not remove Supabase data volumes.

---

# Repository Structure

Prefer the following high-level organization:

```text
chatten/
├── app/
│   ├── (public)/
│   └── admin/
├── components/
│   ├── ui/
│   ├── public/
│   └── admin/
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── validation/
│   └── utils/
├── types/
├── public/
├── supabase/
│   ├── migrations/
│   └── seed/
├── docker/
├── docs/
│   ├── PRD.md
│   ├── SDD.md
│   └── TODO.md
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

Adapt this structure when the implementation provides a clear benefit, but keep concerns separated.

---

# Public Website Rules

The public website is CMS-driven.

Do not hardcode business content that is expected to be manageable from the dashboard.

Examples include:

* hero content
* homepage moments
* about content
* experiences
* spaces
* menu categories
* menu items
* gallery
* testimonials
* promotions
* events
* opening hours
* contact information
* social links
* navigation
* SEO configuration

Static implementation details, layout structure, and design components may remain in code.

Content and presentation structure are different concerns.

Do not build a generic page builder unless explicitly requested.

---

# Management Dashboard

The management dashboard lives under:

`/admin`

The CMS should eventually support management of:

* Dashboard overview
* Hero
* Chatten Moments
* About
* Experiences
* Spaces
* Menu categories
* Menu items
* Gallery
* Testimonials
* Promotions
* Events
* Opening hours
* Contact information
* Social links
* Navigation
* SEO
* Media library
* Users / roles where permitted
* Site settings

CRUD operations must provide appropriate:

* validation
* authorization
* loading states
* error states
* success feedback
* deletion protection / confirmation where needed

Do not expose administrative operations to anonymous visitors.

---

# Validation

Validate data at trust boundaries.

Do not trust browser-submitted data.

Use shared schemas where practical so client and server validation remain consistent.

Validate at minimum:

* required fields
* data types
* URLs
* slugs
* price values
* sort order
* status values
* uploaded file types
* uploaded file sizes

Database constraints should enforce critical invariants even if application validation exists.

---

# Type Safety

Do not scatter manually duplicated database interfaces throughout the codebase.

Maintain a clear strategy for database-generated or centralized TypeScript types.

When database schema changes, update or regenerate relevant types.

Avoid `any` unless there is a documented technical reason.

---

# Error Handling

Do not silently swallow errors.

For user-facing operations:

* provide understandable UI errors

For server operations:

* log useful diagnostic context
* do not log secrets
* do not expose stack traces or sensitive infrastructure details to public users

---

# Public Website Performance

The website is image-heavy and must remain optimized.

Use:

* Next.js image optimization where appropriate
* responsive image sizing
* lazy loading below the fold
* efficient server rendering
* sensible caching
* minimized client-side JavaScript

Do not turn the entire website into Client Components.

Avoid unnecessarily large animation libraries or visual effects that degrade mobile performance.

---

# Design Direction

The current visual direction is:

**Panoramic Editorial**

Characteristics:

* premium but approachable
* nature-led
* editorial
* image-first
* warm
* spacious
* modern
* focused on Chatten's Batu panorama

The website should feel more like a destination/lifestyle experience than a generic restaurant template.

Primary experience themes:

* Morning
* Day
* Golden Hour
* Night

Avoid generic dashboard styling on the public website.

Avoid excessive gradients, glassmorphism, neon UI, or visual trends that conflict with the destination-oriented brand.

---

# SEO

SEO must be treated as a core feature.

Support where appropriate:

* page metadata
* title
* meta description
* canonical URL
* Open Graph metadata
* sitemap
* robots
* structured data
* image alt text

For the public business website, evaluate appropriate structured data such as:

* Restaurant
* LocalBusiness

Do not generate misleading structured data.

CMS-editable SEO fields should be stored in `chatten_cafe` where appropriate.

---

# Testing and Verification

Before considering a feature complete:

1. Run type checking.
2. Run linting.
3. Run relevant tests.
4. Build the application.
5. Verify affected pages.
6. Verify desktop responsiveness.
7. Verify mobile responsiveness.
8. Verify authenticated behavior when applicable.
9. Verify anonymous behavior when applicable.
10. Verify database permissions / RLS for data changes.

Do not report work as complete if the production build fails.

---

# Infrastructure Change Rules

Treat the self-hosted Supabase server as shared and persistent infrastructure.

Before modifying Docker Compose, environment files, reverse proxy configuration, ports, volumes, or Supabase services:

1. Inspect the current configuration.
2. Understand what existing services depend on it.
3. Make the smallest possible change.
4. Preserve unrelated configuration.
5. Verify the affected service after the change.

Do not replace whole infrastructure configuration files with stock templates.

Do not reset Supabase to default configuration simply because local documentation differs.

---

# Git and Repository Safety

Do not commit:

* `.env`
* private keys
* database dumps containing sensitive information
* generated secrets
* runtime uploads
* Docker persistent volumes
* temporary credential files

Do commit:

* `.env.example`
* migrations
* safe seed scripts
* Docker configuration
* documentation
* source code

Do not rewrite Git history unless explicitly instructed.

Do not delete unrelated work.

---

# Documentation

Keep these project documents aligned with implementation:

* `AGENTS.md`
* `docs/PRD.md`
* `docs/SDD.md`
* `docs/TODO.md`
* `README.md`

When implementation materially changes architecture or infrastructure, update the relevant documentation.

`AGENTS.md` defines persistent project rules.

`PRD.md` defines what the product should do.

`SDD.md` defines how the system is designed.

`TODO.md` tracks implementation work.

Do not put temporary task notes into `AGENTS.md`.

---

# Initial Chatten Cafe Schema Requirement

Before implementing CMS entities, ensure the following PostgreSQL schema exists on the self-hosted Supabase database:

```sql
create schema if not exists chatten_cafe;
```

Then configure the self-hosted Supabase API appropriately if direct PostgREST access to this schema is required.

Verify schema existence using PostgreSQL metadata before proceeding with application table migrations.

All future Chatten Cafe-owned tables should default to the `chatten_cafe` schema unless documented otherwise.

Do not create a separate Supabase Cloud project for this schema.

`chatten_cafe` is a PostgreSQL schema inside the existing self-hosted Supabase installation.

---

# Working Principle

When there is a conflict between convenience and these project constraints, prioritize:

1. Data safety.
2. Security.
3. Self-hosted compatibility.
4. Reproducible migrations.
5. Production reliability.
6. Maintainability.
7. Developer convenience.

When infrastructure state is uncertain, inspect the existing self-hosted environment before making assumptions.
