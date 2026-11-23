-- psql -v ON_ERROR_STOP=1 -f supabase/tests/r11_dispute_evidence.sql

\echo 'r11 dispute evidence'

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'dispute-evidence' and public is false) then
    raise exception 'FAIL: dispute-evidence bucket must exist and be private';
  end if;
  raise notice 'PASS: private dispute-evidence bucket';
end $$;

do $$
begin
  if to_regclass('public.dispute_evidence') is null then
    raise exception 'FAIL: dispute_evidence table missing';
  end if;
  raise notice 'PASS: dispute_evidence table';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dispute_evidence' and policyname = 'dispute_evidence_select'
  ) then
    raise exception 'FAIL: dispute_evidence select policy missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'dispute_evidence_storage_select'
  ) then
    raise exception 'FAIL: storage select policy missing';
  end if;
  raise notice 'PASS: RLS policies present';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'can_access_dispute_evidence'
  ) then
    raise exception 'FAIL: can_access_dispute_evidence missing';
  end if;
  raise notice 'PASS: access helper exists';
end $$;
