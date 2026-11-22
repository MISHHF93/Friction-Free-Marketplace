-- r11 ad placement RLS checks against a local Supabase database. Everything
-- runs in one transaction and is rolled back, so no data is left behind.
-- Run: psql "$FFM_LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r11_ads.sql
-- Never point this at a live database.

\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-a011-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r11-member@ffm-test.invalid', now(), '{"display_name":"R11 Member"}', now(), now()),
  ('00000000-0000-4000-a011-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r11-admin@ffm-test.invalid', now(), '{"display_name":"R11 Admin"}', now(), now()),
  ('00000000-0000-4000-a011-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r11-support@ffm-test.invalid', now(), '{"display_name":"R11 Support"}', now(), now());

select set_config('app.allow_privileged_user_update', 'on', true);
update public.users set role = 'admin', status = 'active' where id = '00000000-0000-4000-a011-0000000000c1';
update public.users set role = 'admin', status = 'active', metadata = '{"admin_role":"support"}'::jsonb where id = '00000000-0000-4000-a011-0000000000c2';
update public.users set status = 'active' where id = '00000000-0000-4000-a011-0000000000a1';
select set_config('app.allow_privileged_user_update', 'off', true);

insert into public.ad_campaigns (
  id, placement, title, image_path, alt_text, target_url, advertiser_name, starts_at, ends_at, is_active, priority, weight, category_slug
) values
  ('00000000-0000-4000-b011-000000000001', 'home_top_banner', 'Live home banner', '/icon-1024.png', 'Live banner', '/search', 'FFM', now() - interval '1 hour', now() + interval '1 day', true, 1, 1, null),
  ('00000000-0000-4000-b011-000000000002', 'home_top_banner', 'Paused home banner', '/icon-1024.png', 'Paused banner', '/search', 'FFM', now() - interval '1 hour', now() + interval '1 day', false, 9, 1, null),
  ('00000000-0000-4000-b011-000000000003', 'home_top_banner', 'Expired home banner', '/icon-1024.png', 'Expired banner', '/search', 'FFM', now() - interval '2 days', now() - interval '1 hour', true, 9, 1, null),
  ('00000000-0000-4000-b011-000000000004', 'home_top_banner', 'Future home banner', '/icon-1024.png', 'Future banner', '/search', 'FFM', now() + interval '1 day', now() + interval '2 days', true, 9, 1, null),
  ('00000000-0000-4000-b011-000000000005', 'category_top', 'Electronics only', '/icon-1024.png', 'Category banner', '/search', 'FFM', now() - interval '1 hour', now() + interval '1 day', true, 1, 1, 'electronics');

-- 1. The public can read only active campaigns in their window.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  visible integer;
  hidden integer;
begin
  select count(*) into visible from public.ad_campaigns where id in (
    '00000000-0000-4000-b011-000000000001',
    '00000000-0000-4000-b011-000000000005'
  );
  select count(*) into hidden from public.ad_campaigns where id in (
    '00000000-0000-4000-b011-000000000002',
    '00000000-0000-4000-b011-000000000003',
    '00000000-0000-4000-b011-000000000004'
  );
  if visible <> 2 or hidden <> 0 then
    raise exception 'FAIL: public read window was %, hidden was %', visible, hidden;
  end if;
end $$;
reset role;
select 'PASS 1 public reads only live campaigns' as result;

-- 2. Ordinary members cannot write campaigns or event rows.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a011-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into public.ad_campaigns (placement, title, image_path, alt_text, target_url, advertiser_name, starts_at)
    values ('home_inline', 'Sneaky', '/icon-1024.png', 'Sneaky', '/search', 'Nope', now());
    raise exception 'FAIL: a member inserted a campaign';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ad_events (campaign_id, placement, day, impressions, clicks)
    values ('00000000-0000-4000-b011-000000000001', 'home_top_banner', timezone('utc', now())::date, 1, 0);
    raise exception 'FAIL: a member inserted an ad event';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS 2 members cannot write campaigns or events' as result;

-- 3. Support staff without ads.manage cannot write.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a011-0000000000c2","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if public.current_user_has_admin_permission('ads.manage') then
    raise exception 'FAIL: support unexpectedly has ads.manage';
  end if;
  begin
    update public.ad_campaigns set title = 'Hijacked' where id = '00000000-0000-4000-b011-000000000001';
    if found then raise exception 'FAIL: support updated a campaign'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS 3 support cannot manage ads' as result;

-- 4. Admins with ads.manage can create and pause campaigns, and can see paused ones.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a011-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  paused_visible integer;
  new_id uuid;
begin
  if not public.current_user_has_admin_permission('ads.manage') then
    raise exception 'FAIL: admin is missing ads.manage';
  end if;
  insert into public.ad_campaigns (placement, title, image_path, alt_text, target_url, advertiser_name, starts_at, is_active)
  values ('dashboard_card', 'Admin card', '/icon-1024.png', 'Admin card', 'https://example.com/promo', 'FFM', now(), true)
  returning id into new_id;
  update public.ad_campaigns set is_active = false where id = new_id;
  select count(*) into paused_visible from public.ad_campaigns where id = '00000000-0000-4000-b011-000000000002';
  if paused_visible <> 1 then raise exception 'FAIL: admin could not see a paused campaign'; end if;
end $$;
reset role;
select 'PASS 4 ads.manage admin can write and see paused campaigns' as result;

-- 5. Event increments go through the service function, not public inserts.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $$
declare
  impressions integer;
begin
  perform public.increment_ad_event('00000000-0000-4000-b011-000000000001', 'impression');
  perform public.increment_ad_event('00000000-0000-4000-b011-000000000001', 'click');
  perform public.increment_ad_event('00000000-0000-4000-b011-000000000001', 'impression');
  select e.impressions into impressions
  from public.ad_events e
  where e.campaign_id = '00000000-0000-4000-b011-000000000001'
    and e.day = timezone('utc', now())::date;
  if impressions <> 2 then raise exception 'FAIL: impression count was %', impressions; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.increment_ad_event('00000000-0000-4000-b011-000000000001', 'impression');
    raise exception 'FAIL: anon executed increment_ad_event';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS 5 events aggregate through the service function' as result;

rollback;
