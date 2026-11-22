-- Admin-managed sponsored placements. No payment or ad-network integration.

begin;

insert into public.admin_role_permissions (role, permission, description)
values
  ('admin', 'ads.manage', 'Create and manage sponsored placements'),
  ('super_admin', 'ads.manage', 'Create and manage sponsored placements')
on conflict (role, permission) do update set description = excluded.description;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-creatives',
  'ad-creatives',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  create policy ad_creatives_storage_public_read
    on storage.objects for select
    using (bucket_id = 'ad-creatives');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy ad_creatives_storage_admin_insert
    on storage.objects for insert
    with check (bucket_id = 'ad-creatives' and public.current_user_has_admin_permission('ads.manage'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy ad_creatives_storage_admin_update
    on storage.objects for update
    using (bucket_id = 'ad-creatives' and public.current_user_has_admin_permission('ads.manage'))
    with check (bucket_id = 'ad-creatives' and public.current_user_has_admin_permission('ads.manage'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy ad_creatives_storage_admin_delete
    on storage.objects for delete
    using (bucket_id = 'ad-creatives' and public.current_user_has_admin_permission('ads.manage'));
exception when duplicate_object then null;
end $$;

create table if not exists public.ad_placements (
  key text primary key check (key in (
    'home_top_banner',
    'home_inline',
    'search_inline',
    'category_top',
    'listing_detail_below',
    'dashboard_card'
  )),
  name text not null,
  description text,
  aspect_ratio text not null,
  created_at timestamptz not null default now()
);

insert into public.ad_placements (key, name, description, aspect_ratio)
values
  ('home_top_banner', 'Home top banner', 'Wide banner under the home hero.', '16 / 5'),
  ('home_inline', 'Home inline', 'In-feed unit between home sections.', '16 / 9'),
  ('search_inline', 'Search inline', 'Inserted every few search results.', '16 / 9'),
  ('category_top', 'Category top', 'Banner at the top of a category page.', '16 / 5'),
  ('listing_detail_below', 'Listing detail', 'Unit below the listing details.', '16 / 9'),
  ('dashboard_card', 'Dashboard card', 'Card on the signed-in dashboard.', '16 / 9')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  aspect_ratio = excluded.aspect_ratio;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  placement text not null references public.ad_placements(key) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  image_path text not null check (char_length(image_path) between 1 and 500 and image_path not like '%..%'),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 200),
  target_url text not null check (
    char_length(target_url) between 1 and 2000
    and (
      (target_url like '/%' and target_url not like '//%')
      or target_url ~* '^https://[^[:space:]]+$'
    )
  ),
  advertiser_name text not null check (char_length(btrim(advertiser_name)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default true,
  priority integer not null default 0,
  weight integer not null default 1 check (weight >= 1 and weight <= 1000),
  category_slug text check (category_slug is null or char_length(btrim(category_slug)) between 1 and 80),
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_window_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists ad_campaigns_slot_window_idx
  on public.ad_campaigns (placement, is_active, starts_at, ends_at);

create index if not exists ad_campaigns_category_idx
  on public.ad_campaigns (category_slug)
  where category_slug is not null;

drop trigger if exists ad_campaigns_set_updated_at on public.ad_campaigns;
create trigger ad_campaigns_set_updated_at
  before update on public.ad_campaigns
  for each row execute function public.set_updated_at();

create table if not exists public.ad_events (
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  placement text not null references public.ad_placements(key) on delete restrict,
  day date not null,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  primary key (campaign_id, day)
);

create index if not exists ad_events_placement_day_idx
  on public.ad_events (placement, day);

alter table public.ad_placements enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_events enable row level security;

drop policy if exists ad_placements_public_read on public.ad_placements;
create policy ad_placements_public_read
  on public.ad_placements for select
  using (true);

drop policy if exists ad_campaigns_public_or_admin_read on public.ad_campaigns;
create policy ad_campaigns_public_or_admin_read
  on public.ad_campaigns for select
  using (
    (
      is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
    or public.current_user_has_admin_permission('ads.manage')
  );

drop policy if exists ad_campaigns_admin_insert on public.ad_campaigns;
create policy ad_campaigns_admin_insert
  on public.ad_campaigns for insert
  with check (public.current_user_has_admin_permission('ads.manage'));

drop policy if exists ad_campaigns_admin_update on public.ad_campaigns;
create policy ad_campaigns_admin_update
  on public.ad_campaigns for update
  using (public.current_user_has_admin_permission('ads.manage'))
  with check (public.current_user_has_admin_permission('ads.manage'));

drop policy if exists ad_campaigns_admin_delete on public.ad_campaigns;
create policy ad_campaigns_admin_delete
  on public.ad_campaigns for delete
  using (public.current_user_has_admin_permission('ads.manage'));

drop policy if exists ad_events_admin_read on public.ad_events;
create policy ad_events_admin_read
  on public.ad_events for select
  using (public.current_user_has_admin_permission('ads.manage'));

create or replace function public.increment_ad_event(p_campaign_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  slot text;
begin
  if p_event not in ('impression', 'click') then
    raise exception 'invalid ad event';
  end if;

  select placement into slot from public.ad_campaigns where id = p_campaign_id;
  if slot is null then
    raise exception 'unknown ad campaign';
  end if;

  insert into public.ad_events (campaign_id, placement, day, impressions, clicks)
  values (
    p_campaign_id,
    slot,
    timezone('utc', now())::date,
    case when p_event = 'impression' then 1 else 0 end,
    case when p_event = 'click' then 1 else 0 end
  )
  on conflict (campaign_id, day) do update set
    impressions = public.ad_events.impressions + excluded.impressions,
    clicks = public.ad_events.clicks + excluded.clicks;
end;
$$;

revoke all on function public.increment_ad_event(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_ad_event(uuid, text) to service_role;

grant select on public.ad_placements to anon, authenticated, service_role;
grant select on public.ad_campaigns to anon, authenticated, service_role;
grant select, insert, update, delete on public.ad_campaigns to authenticated, service_role;
grant select on public.ad_events to authenticated, service_role;
grant insert, update on public.ad_events to service_role;

commit;
