-- r12 self-serve ad RLS and lifecycle checks against a local Supabase database.
-- Everything runs in one transaction and is rolled back, so no data is left behind.
-- Run: psql "$FFM_LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r12_self_serve_ads.sql
-- Never point this at a live database.

\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-a012-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r12-adv-a@ffm-test.invalid', now(), '{"display_name":"R12 Advertiser A"}', now(), now()),
  ('00000000-0000-4000-a012-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r12-adv-b@ffm-test.invalid', now(), '{"display_name":"R12 Advertiser B"}', now(), now()),
  ('00000000-0000-4000-a012-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r12-admin@ffm-test.invalid', now(), '{"display_name":"R12 Admin"}', now(), now());

select set_config('app.allow_privileged_user_update', 'on', true);
update public.users set status = 'active' where id in ('00000000-0000-4000-a012-0000000000a1', '00000000-0000-4000-a012-0000000000a2');
update public.users set role = 'admin', status = 'active' where id = '00000000-0000-4000-a012-0000000000c1';
select set_config('app.allow_privileged_user_update', 'off', true);

-- Advertiser A owns one campaign in each state; B owns one live campaign.
insert into public.ad_campaigns (
  id, source, status, advertiser_id, placement, title, image_path, alt_text, target_url, advertiser_name,
  starts_at, ends_at, run_days, price_cents, currency, is_active
) values
  ('00000000-0000-4000-b012-000000000001', 'self_serve', 'draft', '00000000-0000-4000-a012-0000000000a1', 'home_inline', 'A draft', 'advertisers/a/1.png', 'A draft', 'https://a.example/1', 'A', now() - interval '1 hour', now() + interval '6 days', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000002', 'self_serve', 'pending_payment', '00000000-0000-4000-a012-0000000000a1', 'home_inline', 'A pending', 'advertisers/a/2.png', 'A pending', 'https://a.example/2', 'A', now() - interval '1 hour', now() + interval '6 days', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000003', 'self_serve', 'paid_pending_review', '00000000-0000-4000-a012-0000000000a1', 'home_inline', 'A in review', 'advertisers/a/3.png', 'A in review', 'https://a.example/3', 'A', now() - interval '1 hour', now() + interval '6 days', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000004', 'self_serve', 'rejected', '00000000-0000-4000-a012-0000000000a1', 'home_inline', 'A rejected', 'advertisers/a/4.png', 'A rejected', 'https://a.example/4', 'A', now() - interval '1 hour', now() + interval '6 days', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000005', 'self_serve', 'active', '00000000-0000-4000-a012-0000000000a2', 'home_inline', 'B live', 'advertisers/b/5.png', 'B live', 'https://b.example/5', 'B', now() - interval '1 hour', now() + interval '6 days', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000006', 'self_serve', 'approved', '00000000-0000-4000-a012-0000000000a2', 'home_inline', 'B approved past end', 'advertisers/b/6.png', 'B old', 'https://b.example/6', 'B', now() - interval '8 days', now() - interval '1 day', 7, 10500, 'usd', true),
  ('00000000-0000-4000-b012-000000000007', 'self_serve', 'approved', '00000000-0000-4000-a012-0000000000a2', 'home_inline', 'B approved now', 'advertisers/b/7.png', 'B now', 'https://b.example/7', 'B', now() - interval '1 minute', now() + interval '3 days', 3, 4500, 'usd', true);

-- An admin-made r11 campaign keeps its default status and still serves.
insert into public.ad_campaigns (id, placement, title, image_path, alt_text, target_url, advertiser_name, starts_at, ends_at, is_active)
values ('00000000-0000-4000-b012-000000000010', 'home_top_banner', 'Admin banner', '/icon-1024.png', 'Admin banner', '/search', 'FFM', now() - interval '1 hour', now() + interval '1 day', true);

-- 1. Public sees only approved/active live campaigns.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  visible integer;
  hidden integer;
begin
  select count(*) into visible from public.ad_campaigns where id in (
    '00000000-0000-4000-b012-000000000005', '00000000-0000-4000-b012-000000000007', '00000000-0000-4000-b012-000000000010');
  select count(*) into hidden from public.ad_campaigns where id in (
    '00000000-0000-4000-b012-000000000001', '00000000-0000-4000-b012-000000000002', '00000000-0000-4000-b012-000000000003',
    '00000000-0000-4000-b012-000000000004', '00000000-0000-4000-b012-000000000006');
  if visible <> 3 or hidden <> 0 then
    raise exception 'FAIL: public saw % live (want 3) and % hidden (want 0)', visible, hidden;
  end if;
  if (select count(*) from public.ad_pricing) <> 6 then raise exception 'FAIL: public cannot read pricing'; end if;
end $$;
reset role;
select 'PASS 1 public reads only approved live campaigns and pricing' as result;

-- 2. Advertiser A sees all of A's campaigns, none of B's non-live ones, and cannot write.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a012-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  own integer;
  others integer;
begin
  select count(*) into own from public.ad_campaigns where advertiser_id = '00000000-0000-4000-a012-0000000000a1';
  select count(*) into others from public.ad_campaigns where id = '00000000-0000-4000-b012-000000000006';
  if own <> 4 then raise exception 'FAIL: advertiser A saw % own campaigns (want 4)', own; end if;
  if others <> 0 then raise exception 'FAIL: advertiser A saw B''s expired campaign'; end if;
  begin
    insert into public.ad_campaigns (source, status, advertiser_id, placement, title, image_path, alt_text, target_url, advertiser_name, starts_at, ends_at, run_days, price_cents, currency)
    values ('self_serve', 'approved', '00000000-0000-4000-a012-0000000000a1', 'home_inline', 'Self-approved', 'x.png', 'x', 'https://a.example', 'A', now(), now() + interval '1 day', 1, 0, 'usd');
    raise exception 'FAIL: advertiser inserted a campaign directly';
  exception when insufficient_privilege then null;
  end;
  update public.ad_campaigns set status = 'approved' where id = '00000000-0000-4000-b012-000000000003';
  if found then raise exception 'FAIL: advertiser approved their own campaign'; end if;
  update public.ad_campaigns set title = 'Hijack' where id = '00000000-0000-4000-b012-000000000005';
  if found then raise exception 'FAIL: advertiser edited another advertiser''s campaign'; end if;
  update public.ad_pricing set price_cents_per_day = 100 where placement = 'home_inline';
  if found then raise exception 'FAIL: advertiser changed pricing'; end if;
end $$;
reset role;
select 'PASS 2 advertisers see only their own ads and cannot write' as result;

-- 3. Event counts: only servable campaigns count; advertisers read only their own totals.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $$
declare
  n integer;
begin
  perform public.increment_ad_event('00000000-0000-4000-b012-000000000005', 'impression');
  perform public.increment_ad_event('00000000-0000-4000-b012-000000000005', 'click');
  perform public.increment_ad_event('00000000-0000-4000-b012-000000000003', 'impression');
  select count(*) into n from public.ad_events where campaign_id = '00000000-0000-4000-b012-000000000003';
  if n <> 0 then raise exception 'FAIL: an unapproved campaign counted an impression'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a012-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select coalesce(sum(impressions), 0) from public.ad_events where campaign_id = '00000000-0000-4000-b012-000000000005') <> 1 then
    raise exception 'FAIL: advertiser B cannot read own impressions';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a012-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.ad_events where campaign_id = '00000000-0000-4000-b012-000000000005') <> 0 then
    raise exception 'FAIL: advertiser A read B''s event totals';
  end if;
end $$;
reset role;
select 'PASS 3 only approved ads count events; advertisers read only their own totals' as result;

-- 4. Admin with ads.manage sees the review queue and can edit pricing.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a012-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.ad_campaigns where status = 'paid_pending_review' and id = '00000000-0000-4000-b012-000000000003') <> 1 then
    raise exception 'FAIL: admin cannot see the review queue';
  end if;
  update public.ad_pricing set price_cents_per_day = 2500 where placement = 'home_inline';
  if not found then raise exception 'FAIL: admin could not edit pricing'; end if;
end $$;
reset role;
select 'PASS 4 ads.manage admin sees review queue and edits pricing' as result;

-- 5. Lifecycle sweep is service-only and moves approved -> active and past-end -> expired.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.advance_ad_campaign_lifecycle();
    raise exception 'FAIL: anon ran the lifecycle sweep';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
alter table public.ad_campaigns disable trigger ad_campaigns_set_updated_at;
update public.ad_campaigns set updated_at = now() - interval '3 hours' where id = '00000000-0000-4000-b012-000000000002';
alter table public.ad_campaigns enable trigger ad_campaigns_set_updated_at;
do $$
declare
  r record;
begin
  select * into r from public.advance_ad_campaign_lifecycle();
  if (select status from public.ad_campaigns where id = '00000000-0000-4000-b012-000000000006') <> 'expired' then
    raise exception 'FAIL: past-end campaign was not expired';
  end if;
  if (select status from public.ad_campaigns where id = '00000000-0000-4000-b012-000000000007') <> 'active' then
    raise exception 'FAIL: started approved campaign was not activated';
  end if;
  if (select status from public.ad_campaigns where id = '00000000-0000-4000-b012-000000000002') <> 'draft' then
    raise exception 'FAIL: stale pending_payment was not reopened as draft';
  end if;
  if (select status from public.ad_campaigns where id = '00000000-0000-4000-b012-000000000010') <> 'approved' then
    raise exception 'FAIL: the sweep touched an admin campaign';
  end if;
end $$;
select 'PASS 5 lifecycle sweep activates, expires and reopens stale checkouts' as result;

-- 6. Self-serve rows must carry advertiser, price and an end date.
do $$
begin
  begin
    insert into public.ad_campaigns (source, status, placement, title, image_path, alt_text, target_url, advertiser_name, starts_at)
    values ('self_serve', 'draft', 'home_inline', 'Orphan', 'x.png', 'x', 'https://a.example', 'A', now());
    raise exception 'FAIL: self-serve row without advertiser was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.ad_campaigns set status = 'bogus' where id = '00000000-0000-4000-b012-000000000001';
    raise exception 'FAIL: unknown status accepted';
  exception when check_violation then null;
  end;
end $$;
select 'PASS 6 self-serve constraints hold' as result;

rollback;
