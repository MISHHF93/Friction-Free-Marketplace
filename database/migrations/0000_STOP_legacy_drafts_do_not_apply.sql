-- STOP. This folder is an archived draft, not the live schema.
-- The only migration history is supabase/migrations (applied with `supabase db push`).
-- Running these numbered files in order hits this guard first and aborts.
do $$
begin
  raise exception 'database/migrations is archived. Apply supabase/migrations with the Supabase CLI instead.';
end
$$;
