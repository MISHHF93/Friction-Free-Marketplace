-- r10 lifecycle checks against a local Supabase database. Everything runs in
-- one transaction and is rolled back, so no data is left behind.
-- Run: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r10_lifecycle.sql
-- Never point this at a live database.

\set ON_ERROR_STOP 1
begin;

-- Fixtures (as the database owner, like the service role).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-a000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r10-seller@ffm-test.invalid', now(), '{"display_name":"R10 Seller"}', now(), now()),
  ('00000000-0000-4000-a000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r10-buyer@ffm-test.invalid', now(), '{"display_name":"R10 Buyer"}', now(), now()),
  ('00000000-0000-4000-a000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r10-buyer2@ffm-test.invalid', now(), '{"display_name":"R10 Buyer Two"}', now(), now()),
  ('00000000-0000-4000-a000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r10-admin@ffm-test.invalid', now(), '{"display_name":"R10 Admin"}', now(), now());

select set_config('app.allow_privileged_user_update', 'on', true);
update public.users set role = 'admin' where id = '00000000-0000-4000-a000-0000000000c1';
update public.users set status = 'active' where id in ('00000000-0000-4000-a000-0000000000a1', '00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000b2', '00000000-0000-4000-a000-0000000000c1');
select set_config('app.allow_privileged_user_update', 'off', true);

insert into public.listings (id, seller_id, title, description, price_amount, status, quantity, metadata)
values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-0000000000a1', 'R10 held lamp', 'A lamp used to test admin holds in r10.', 40, 'active', 1, '{}'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-0000000000a1', 'R10 checkout desk', 'A desk used to test abandoned checkout in r10.', 120, 'active', 1, '{}'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-0000000000a1', 'R10 offer chair', 'A chair used to test offer expiry in r10.', 60, 'active', 1, '{}');

-- 1. An abandoned checkout blocks other buyers until it is cancelled, then the listing frees up.
insert into public.transactions (id, listing_id, buyer_id, seller_id, item_amount, status, idempotency_key)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000a1', 120, 'pending_payment', 'r10-abandoned');
do $$
begin
  begin
    insert into public.transactions (listing_id, buyer_id, seller_id, item_amount, status, idempotency_key)
    values ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-0000000000b2', '00000000-0000-4000-a000-0000000000a1', 120, 'pending_payment', 'r10-second');
    raise exception 'FAIL: a second open checkout was allowed';
  exception when unique_violation then null;
  end;
end $$;
update public.transactions set status = 'cancelled', cancelled_at = now() where id = '00000000-0000-4000-c000-000000000001';
insert into public.transactions (id, listing_id, buyer_id, seller_id, item_amount, status, idempotency_key)
values ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-0000000000b2', '00000000-0000-4000-a000-0000000000a1', 120, 'pending_payment', 'r10-second');
select 'PASS 1 abandoned checkout frees the listing' as result;

-- 2. Deletion is refused while the member has open orders.
do $$
begin
  begin
    perform public.anonymize_marketplace_account('00000000-0000-4000-a000-0000000000b2');
    raise exception 'FAIL: deletion with an open order was allowed';
  exception when others then
    if sqlerrm not like 'account_has_open_orders%' then raise; end if;
  end;
end $$;
select 'PASS 2 deletion refused with open orders' as result;

-- 3. A seller cannot sell, archive or delete a listing with an open order.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    update public.listings set status = 'sold' where id = '00000000-0000-4000-b000-000000000002';
    raise exception 'FAIL: seller marked a listing in an open order sold';
  exception when others then
    if sqlerrm not like 'listing_has_open_order%' then raise; end if;
  end;
end $$;
reset role;
select 'PASS 3 open order blocks seller sold/archive' as result;

-- 4. A seller cannot republish an admin hold or clear the hold.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.admin_record_listing_decision('00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-b000-000000000001', 'hold', 'r10 test hold');
do $$ begin
  if (select status::text from public.listings where id = '00000000-0000-4000-b000-000000000001') <> 'paused' then raise exception 'FAIL: hold did not pause'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
update public.listings set metadata = metadata - 'moderation_hold' - 'paused_by' || '{"moderation_status":"approved"}' where id = '00000000-0000-4000-b000-000000000001';
do $$
begin
  begin
    update public.listings set status = 'active' where id = '00000000-0000-4000-b000-000000000001';
    raise exception 'FAIL: seller republished an admin hold';
  exception when others then
    if sqlerrm not like 'listing_on_hold%' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $$ begin
  if (select metadata->>'moderation_hold' from public.listings where id = '00000000-0000-4000-b000-000000000001') is distinct from 'admin_hold' then raise exception 'FAIL: seller cleared the hold'; end if;
  if (select metadata->>'moderation_status' from public.listings where id = '00000000-0000-4000-b000-000000000001') <> 'needs_review' then raise exception 'FAIL: seller self-approved'; end if;
end $$;
select public.admin_record_listing_decision('00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-b000-000000000001', 'approve', 'r10 test approve');
do $$ begin
  if (select status::text from public.listings where id = '00000000-0000-4000-b000-000000000001') <> 'active' then raise exception 'FAIL: approve did not republish'; end if;
end $$;
select 'PASS 4 seller cannot republish an admin hold; admin approve restores it' as result;

-- 5. Pending offers expire when the listing becomes unavailable.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into public.offers (id, listing_id, buyer_id, seller_id, amount, status, created_by_id)
values ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000a1', 50, 'pending', '00000000-0000-4000-a000-0000000000b1');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
update public.listings set status = 'archived' where id = '00000000-0000-4000-b000-000000000003';
reset role;
do $$ begin
  if (select status::text from public.offers where id = '00000000-0000-4000-d000-000000000001') <> 'expired' then raise exception 'FAIL: offer stayed pending'; end if;
end $$;
select 'PASS 5 offers close when the listing is archived' as result;

-- 6. A suspended member is blocked from writing, and a timed suspension lifts.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('app.allow_privileged_user_update', 'on', true);
update public.users set status = 'suspended' where id = '00000000-0000-4000-a000-0000000000b1';
select set_config('app.allow_privileged_user_update', 'off', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.listings (seller_id, title, description, price_amount, status)
    values ('00000000-0000-4000-a000-0000000000b1', 'Suspended listing', 'This should never be created by a suspended member.', 10, 'draft');
    raise exception 'FAIL: suspended member created a listing';
  exception when others then
    if sqlerrm not like 'account_restricted%' then raise; end if;
  end;
  begin
    insert into public.offers (listing_id, buyer_id, seller_id, amount, status, created_by_id)
    values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000a1', 30, 'pending', '00000000-0000-4000-a000-0000000000b1');
    raise exception 'FAIL: suspended member made an offer';
  exception when others then
    if sqlerrm not like 'account_restricted%' and sqlerrm not like '%row-level security%' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into public.user_restrictions (user_id, created_by, restriction_type, reason, starts_at, expires_at, status)
values ('00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000c1', 'full_suspension', 'r10 test', now() - interval '2 days', now() - interval '1 day', 'active');
do $$ begin
  if public.lift_expired_suspensions() < 1 then raise exception 'FAIL: expired suspension did not lift'; end if;
  if (select status::text from public.users where id = '00000000-0000-4000-a000-0000000000b1') <> 'active' then raise exception 'FAIL: member still suspended'; end if;
end $$;
select 'PASS 6 suspended member blocked; expired suspension lifts' as result;

rollback;
