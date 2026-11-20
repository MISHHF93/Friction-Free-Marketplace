-- Host-only reset. Do not run this against production until the dry-run counts are reviewed.
-- The transaction below ends in ROLLBACK. Change that line to COMMIT only after the counts are expected.

-- DRY RUN
select 'example_com_users' as marker, count(*) from public.users where email::text ilike '%@example.com';
select 'seed_user_ids' as marker, count(*) from public.users where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);
select 'demo_listing_titles' as marker, count(*) from public.listings where title in (
  'Verified carbon road bike',
  'Modular designer sofa',
  'Mirrorless camera creator kit'
) or coalesce(metadata->>'is_demo', '') = 'true';

-- APPLY
begin;

create temporary table seed_user_ids (id uuid primary key) on commit drop;
insert into seed_user_ids (id)
select id from public.users
where email::text ilike '%@example.com'
   or id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222',
     '44444444-4444-4444-8444-444444444444',
     '55555555-5555-4555-8555-555555555555',
     '66666666-6666-4666-8666-666666666666'
   );

delete from public.listings
where seller_id in (select id from seed_user_ids)
   or title in ('Verified carbon road bike', 'Modular designer sofa', 'Mirrorless camera creator kit')
   or coalesce(metadata->>'is_demo', '') = 'true';

delete from public.users where id in (select id from seed_user_ids);

delete from auth.users
where id in (select id from seed_user_ids)
   or email ilike '%@example.com';

-- Leave ROLLBACK in place until a human replaces it with COMMIT.
rollback;
