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

select id, email::text as email
from public.users
where email::text ilike '%@example.com'
order by email;

select count(*) as demo_transactions
from public.transactions as transaction_row
where transaction_row.id in (
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    '66666666-6666-4666-8666-666666666666'
  )
   or (
     coalesce(transaction_row.metadata->>'is_demo', '') = 'true'
     and (
       transaction_row.buyer_id in (
         '11111111-1111-4111-8111-111111111111',
         '22222222-2222-4222-8222-222222222222'
       )
       or transaction_row.seller_id in (
         '11111111-1111-4111-8111-111111111111',
         '22222222-2222-4222-8222-222222222222'
       )
       or exists (
         select 1 from public.users as account
         where account.email::text ilike '%@example.com'
           and account.id in (transaction_row.buyer_id, transaction_row.seller_id)
       )
     )
   )
   or (
     transaction_row.buyer_id in (
       '11111111-1111-4111-8111-111111111111',
       '22222222-2222-4222-8222-222222222222'
     )
     and transaction_row.seller_id in (
       '11111111-1111-4111-8111-111111111111',
       '22222222-2222-4222-8222-222222222222'
     )
   );

-- Run this before applying 20260728150000. That migration rebuilds unique
-- indexes and aborts if either query returns a row. It is not merged yet, so
-- do not edit it while dc20ded is under test. Fold this check into that file
-- only if that commit is rewritten before it is applied.
select listing_id, count(*) as open_checkouts
from public.transactions
where listing_id is not null
  and status in ('pending_payment', 'paid', 'escrowed', 'shipped', 'delivered', 'disputed', 'resolving')
group by listing_id
having count(*) > 1;

select offer_id, count(*) as open_offer_checkouts
from public.transactions
where offer_id is not null
  and status in ('pending_payment', 'paid', 'escrowed', 'shipped', 'delivered', 'disputed', 'resolving')
group by offer_id
having count(*) > 1;

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
