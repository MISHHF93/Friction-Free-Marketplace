-- Read-only launch preflight. Safe to run on production.
-- The predicates match scripts/prod/reset-demo-data.sql.
-- 4444, 5555, and 6666 are e2e transaction ids, not user ids.

select version
from supabase_migrations.schema_migrations
order by version;

select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

select count(*) as seed_or_example_users
from public.users
where email::text ilike '%@example.com'
   or id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );

select count(*) as e2e_transactions
from public.transactions
where id in (
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);

select count(*) as demo_listings
from public.listings
where coalesce(metadata->>'is_demo', '') = 'true'
   or seller_id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );

select count(*) as active_categories
from public.categories
where is_active = true;

select proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public'
  and proname in (
    'activate_auth_user_profile',
    'anonymize_marketplace_account',
    'admin_set_user_status',
    'claim_escrow_payment',
    'claim_dispute_settlement',
    'open_dispute'
  )
order by proname;

select polname, polcmd
from pg_policy
join pg_class on pg_class.oid = pg_policy.polrelid
where relname = 'contact_messages'
order by polname;
