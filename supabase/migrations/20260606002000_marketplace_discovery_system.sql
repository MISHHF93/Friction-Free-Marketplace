-- Marketplace discovery system: Meilisearch document view, engagement stats,
-- recent views, saved-search alert matching, and indexes for backend sync jobs.

begin;

create table if not exists public.listing_discovery_stats (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  view_count integer not null default 0 check (view_count >= 0),
  saved_count integer not null default 0 check (saved_count >= 0),
  purchase_count integer not null default 0 check (purchase_count >= 0),
  last_viewed_at timestamptz,
  last_saved_at timestamptz,
  trend_score numeric(10,2) not null default 0,
  value_score numeric(10,2) not null default 0,
  safety_score numeric(10,2) not null default 0,
  conversion_score numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_listing_discovery_stats_updated_at on public.listing_discovery_stats;
create trigger set_listing_discovery_stats_updated_at
before update on public.listing_discovery_stats
for each row execute function public.set_updated_at();

create table if not exists public.recently_viewed_listings (
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb,
  primary key (user_id, listing_id)
);

create table if not exists public.saved_search_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  delivered_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  unique (saved_search_id, listing_id)
);

alter table public.saved_searches
  add column if not exists last_checked_at timestamptz,
  add column if not exists min_alert_interval_minutes integer not null default 0 check (min_alert_interval_minutes >= 0),
  add column if not exists delivery_channels text[] not null default array['in_app']::text[];

create or replace view public.listing_search_documents as
select
  l.id,
  l.title,
  l.description,
  l.category_id,
  coalesce(c.slug::text, l.metadata->>'category_slug', 'other') as category_slug,
  coalesce(c.name, initcap(replace(coalesce(l.metadata->>'category_slug', 'other'), '-', ' '))) as category_name,
  coalesce(l.condition, 'Unspecified') as condition,
  l.status::text as status,
  l.price_amount,
  l.currency,
  l.location_city,
  l.location_region,
  l.location_country,
  concat_ws(', ', l.location_city, l.location_region) as location_label,
  nullif(l.metadata->>'latitude', '')::numeric as latitude,
  nullif(l.metadata->>'longitude', '')::numeric as longitude,
  l.pickup_available,
  l.ships_to,
  l.seller_id,
  coalesce(p.display_name, 'Verified seller') as seller_display_name,
  coalesce(ts.seller_score, ts.score, 0) as seller_trust_score,
  coalesce(ts.completed_transactions, 0) as seller_completed_transactions,
  coalesce(ts.fraud_risk_level, 'low') as seller_fraud_risk_level,
  img.public_url as image_url,
  coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(l.metadata->'seo_tags', '[]'::jsonb)) as value), array[]::text[]) as seo_tags,
  coalesce((select array_agg(la.name || ':' || la.value order by la.name) from public.listing_attributes la where la.listing_id = l.id), array[]::text[]) as attributes,
  coalesce(ds.view_count, 0) as view_count,
  coalesce(ds.saved_count, 0) as saved_count,
  coalesce(ds.purchase_count, 0) as purchase_count,
  coalesce(ds.trend_score, (coalesce(ds.view_count, 0) * 0.20) + (coalesce(ds.saved_count, 0) * 1.5)) as trend_score,
  coalesce(ds.value_score, greatest(0, 100 - (l.price_amount / 100)) + coalesce(ts.seller_score, ts.score, 0) * 0.35) as value_score,
  coalesce(ds.safety_score, coalesce(ts.seller_score, ts.score, 0) - case coalesce(ts.fraud_risk_level, 'low') when 'critical' then 60 when 'high' then 35 when 'medium' then 15 else 0 end) as safety_score,
  coalesce(ds.conversion_score, coalesce(ts.seller_score, ts.score, 0) + coalesce(ds.saved_count, 0) * 0.75 + coalesce(ds.purchase_count, 0) * 4) as conversion_score,
  l.published_at,
  l.created_at,
  l.updated_at
from public.listings l
left join public.categories c on c.id = l.category_id
left join public.profiles p on p.user_id = l.seller_id
left join public.trust_scores ts on ts.user_id = l.seller_id
left join public.listing_discovery_stats ds on ds.listing_id = l.id
left join lateral (
  select public_url
  from public.listing_images li
  where li.listing_id = l.id and li.status = 'ready'
  order by li.sort_order asc, li.created_at asc
  limit 1
) img on true
where l.deleted_at is null;

create or replace function public.increment_listing_view(target_listing_id uuid, viewer_id uuid default auth.uid(), event_context jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.listing_discovery_stats (listing_id, view_count, last_viewed_at)
  values (target_listing_id, 1, now())
  on conflict (listing_id) do update set
    view_count = public.listing_discovery_stats.view_count + 1,
    last_viewed_at = now(),
    trend_score = public.listing_discovery_stats.trend_score + 0.2,
    updated_at = now();

  if viewer_id is not null then
    insert into public.recently_viewed_listings (user_id, listing_id, viewed_at, context)
    values (viewer_id, target_listing_id, now(), event_context)
    on conflict (user_id, listing_id) do update set viewed_at = excluded.viewed_at, context = excluded.context;
  end if;
end;
$$;

create or replace function public.saved_search_matches_listing(saved_filters jsonb, saved_query text, target_listing public.listings)
returns boolean
language plpgsql
stable
as $$
declare
  min_price numeric := nullif(saved_filters->>'minPrice', '')::numeric;
  max_price numeric := nullif(saved_filters->>'maxPrice', '')::numeric;
  min_trust numeric := nullif(saved_filters->>'minSellerTrust', '')::numeric;
  seller_trust numeric;
begin
  select coalesce(seller_score, score, 0) into seller_trust from public.trust_scores where user_id = target_listing.seller_id;

  return target_listing.status = 'active'
    and target_listing.deleted_at is null
    and (saved_query is null or saved_query = '' or target_listing.search_vector @@ websearch_to_tsquery('english', saved_query))
    and (saved_filters->>'category' is null or saved_filters->>'category' = coalesce((select slug::text from public.categories where id = target_listing.category_id), target_listing.metadata->>'category_slug'))
    and (min_price is null or target_listing.price_amount >= min_price)
    and (max_price is null or target_listing.price_amount <= max_price)
    and (saved_filters->>'condition' is null or target_listing.condition = any(string_to_array(saved_filters->>'condition', ',')))
    and (min_trust is null or coalesce(seller_trust, 0) >= min_trust);
end;
$$;

create or replace function public.enqueue_saved_search_alerts_for_listing(target_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_listing public.listings;
  inserted_count integer := 0;
begin
  select * into target_listing from public.listings where id = target_listing_id;
  if target_listing.id is null then
    return 0;
  end if;

  with matching as (
    select ss.*
    from public.saved_searches ss
    where ss.alert_enabled
      and ss.alert_frequency <> 'never'
      and public.saved_search_matches_listing(ss.filters, ss.query, target_listing)
      and not exists (
        select 1 from public.saved_search_alert_deliveries d
        where d.saved_search_id = ss.id and d.listing_id = target_listing.id
      )
  ), notifications_inserted as (
    insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
    select
      user_id,
      'saved_search_match',
      'New listing for ' || name,
      target_listing.title || ' matches your saved search.',
      'in_app',
      '/listings/' || target_listing.id,
      jsonb_build_object('saved_search_id', id, 'listing_id', target_listing.id, 'query', query, 'filters', filters)
    from matching
    returning id, user_id, payload
  ), deliveries as (
    insert into public.saved_search_alert_deliveries (saved_search_id, user_id, listing_id, notification_id, payload)
    select (payload->>'saved_search_id')::uuid, user_id, target_listing.id, id, payload
    from notifications_inserted
    on conflict (saved_search_id, listing_id) do nothing
    returning id
  )
  select count(*) into inserted_count from deliveries;

  update public.saved_searches ss
  set last_checked_at = now(), last_notified_at = case when inserted_count > 0 then now() else ss.last_notified_at end
  where exists (select 1 from public.saved_search_alert_deliveries d where d.saved_search_id = ss.id and d.listing_id = target_listing.id);

  return inserted_count;
end;
$$;

grant select on public.listing_search_documents to anon, authenticated, service_role;
grant select, insert, update, delete on public.recently_viewed_listings to authenticated;
grant execute on function public.increment_listing_view(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.enqueue_saved_search_alerts_for_listing(uuid) to service_role;

alter table public.listing_discovery_stats enable row level security;
alter table public.recently_viewed_listings enable row level security;
alter table public.saved_search_alert_deliveries enable row level security;

create policy listing_discovery_stats_public_read on public.listing_discovery_stats for select using (true);
create policy listing_discovery_stats_admin_write on public.listing_discovery_stats for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy recently_viewed_owner_crud on public.recently_viewed_listings for all using (user_id = auth.uid() or public.current_user_is_admin()) with check (user_id = auth.uid() or public.current_user_is_admin());
create policy saved_search_alert_deliveries_owner_read on public.saved_search_alert_deliveries for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy saved_search_alert_deliveries_admin_write on public.saved_search_alert_deliveries for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create index if not exists listing_discovery_stats_trending_idx on public.listing_discovery_stats(trend_score desc, updated_at desc);
create index if not exists listing_discovery_stats_value_idx on public.listing_discovery_stats(value_score desc, updated_at desc);
create index if not exists listing_discovery_stats_safety_idx on public.listing_discovery_stats(safety_score desc, updated_at desc);
create index if not exists recently_viewed_user_viewed_idx on public.recently_viewed_listings(user_id, viewed_at desc);
create index if not exists saved_search_alert_deliveries_user_idx on public.saved_search_alert_deliveries(user_id, delivered_at desc);
create index if not exists saved_searches_alerts_idx on public.saved_searches(alert_enabled, alert_frequency, updated_at desc) where alert_enabled;
create index if not exists listings_location_metadata_idx on public.listings((metadata->>'latitude'), (metadata->>'longitude')) where status = 'active' and deleted_at is null;

commit;
