-- Host-only reset. Do not run this against production until the dry-run counts are reviewed.
-- The transaction below ends in ROLLBACK. Change that line to COMMIT only after the counts are expected.
-- psql: \set ON_ERROR_STOP on
\set ON_ERROR_STOP on

-- Seed users are the two e2e accounts and any @example.com address.
-- 4444, 5555, and 6666 are e2e transaction ids, not user ids.
-- Listings are removed only for those sellers or when metadata.is_demo is true.

-- DRY RUN
select 'example_com_or_seed_users' as marker, count(*) from public.users where email::text ilike '%@example.com'
   or id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );
select 'e2e_transaction_ids' as marker, count(*) from public.transactions where id in (
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);
select 'demo_listings' as marker, count(*) from public.listings
where coalesce(metadata->>'is_demo', '') = 'true'
   or seller_id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );

-- APPLY
begin;

do $$
begin
  if coalesce(current_setting('app.reset_allowed', true), '') is distinct from 'yes' then
    raise exception 'Refusing reset. For this session run: select set_config(''app.reset_allowed'', ''yes'', true);';
  end if;
end $$;

create temporary table seed_user_ids (id uuid primary key) on commit drop;
insert into seed_user_ids (id)
select id from public.users
where email::text ilike '%@example.com'
   or id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );

create temporary table demo_transaction_ids (id uuid primary key) on commit drop;
insert into demo_transaction_ids (id)
select transaction_row.id
from public.transactions as transaction_row
where transaction_row.id in (
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    '66666666-6666-4666-8666-666666666666'
  )
   or coalesce(transaction_row.metadata->>'is_demo', '') = 'true'
   or (
     transaction_row.buyer_id in (select id from seed_user_ids)
     and transaction_row.seller_id in (select id from seed_user_ids)
   );

do $$
begin
  if exists (
    select 1
    from public.transactions as transaction_row
    where transaction_row.id not in (select id from demo_transaction_ids)
      and (
        transaction_row.buyer_id in (select id from seed_user_ids)
        or transaction_row.seller_id in (select id from seed_user_ids)
      )
  ) then
    raise exception 'A seed user has a transaction that is not a demo fixture.';
  end if;

  if exists (
    select 1
    from public.financial_ledger_entries as entry
    where entry.user_id in (select id from seed_user_ids)
      and (entry.transaction_id is null or entry.transaction_id not in (select id from demo_transaction_ids))
  ) then
    raise exception 'A seed user has a ledger row that is not a demo fixture.';
  end if;

  if exists (
    select 1
    from public.escrow_payments as payment
    join public.transactions as transaction_row on transaction_row.id = payment.transaction_id
    where transaction_row.id not in (select id from demo_transaction_ids)
      and (
        transaction_row.buyer_id in (select id from seed_user_ids)
        or transaction_row.seller_id in (select id from seed_user_ids)
      )
  ) then
    raise exception 'A seed user has an escrow payment that is not a demo fixture.';
  end if;
end $$;

delete from storage.objects
where bucket_id in ('listing-images', 'message-attachments')
  and (storage.foldername(name))[1] in (select id::text from seed_user_ids);

delete from public.financial_ledger_entries
where transaction_id in (select id from demo_transaction_ids)
   or user_id in (select id from seed_user_ids);

delete from public.financial_ledger_journals
where transaction_id in (select id from demo_transaction_ids);

delete from public.payouts
where transaction_id in (select id from demo_transaction_ids)
   or seller_id in (select id from seed_user_ids);

delete from public.transaction_receipts
where transaction_id in (select id from demo_transaction_ids)
   or buyer_id in (select id from seed_user_ids)
   or seller_id in (select id from seed_user_ids);

delete from public.transactions
where id in (select id from demo_transaction_ids);

delete from public.listings
where seller_id in (select id from seed_user_ids)
   or coalesce(metadata->>'is_demo', '') = 'true';

delete from public.admin_actions
where admin_id in (select id from seed_user_ids);

delete from public.users where id in (select id from seed_user_ids);

delete from auth.users
where id in (select id from seed_user_ids)
   or email ilike '%@example.com';

-- Leave ROLLBACK in place until a human replaces it with COMMIT.
rollback;
