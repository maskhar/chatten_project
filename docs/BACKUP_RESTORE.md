# Backup and Restore

## Database

Run backups from the self-hosted Supabase Docker directory. Create a custom-format dump limited to `chatten_cafe`, store it outside the host's temporary directory, encrypt it at rest, and retain it under operator policy.

```bash
docker exec supabase-db pg_dump -U postgres -Fc -n chatten_cafe postgres > chatten_cafe_YYYYMMDD.dump
```

Restore only into an isolated drill database first. The drill needs minimal `auth.users` and `auth.uid()` compatibility because application foreign keys and RLS policies reference Supabase Auth. Never restore into production without an approved recovery plan.

## Media

Back up the configured self-hosted Storage object backend and `chatten_cafe.media` metadata together. Verify object paths and metadata remain synchronized before a restore. Do not treat a PostgreSQL dump as a media backup.

## Verified Drill

On September 9, 2026, an isolated `chatten_cafe` dump/restore drill succeeded: 20 application tables restored, then the temporary drill database and dump were removed.
