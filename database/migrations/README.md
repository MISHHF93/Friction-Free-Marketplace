# Archived SQL

`supabase/migrations` is the only migration history that launch and local Supabase apply.

The numbered files in this folder are an older draft. Do not run them against a database that already uses `supabase/migrations`. They are kept so the earlier design can be read. They are not a second schema.

## Guard

`0000_STOP_legacy_drafts_do_not_apply.sql` sorts first and raises an exception, so running this folder in order stops before any draft runs. `npm run database:verify` (part of `release:check`) runs `scripts/guard-legacy-migrations.mjs`, which fails if that guard is removed, if `supabase/config.toml` points here, or if a file without a 14-digit timestamp lands in `supabase/migrations`.

To change the schema, add a new timestamped file under `supabase/migrations` and apply it with `supabase db push`. Never edit an applied migration.
