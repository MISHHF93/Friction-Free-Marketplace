-- Harden saved-search matching and alert delivery cadence.
-- Keeps saved-search notifications owner-scoped while making the matching job
-- resilient to malformed filter JSON and respecting digest throttles.

begin;

create or replace function public.saved_search_matches_listing(saved_filters jsonb, saved_query text, target_listing public.listings)
returns boolean
language plpgsql
stable
as $$
declare
  min_price numeric := case when coalesce(saved_filters->>'minPrice', '') ~ '^[0-9]+(\.[0-9]+)?$' then (saved_filters->>'minPrice')::numeric else null end;
  max_price numeric := case when coalesce(saved_filters->>'maxPrice', '') ~ '^[0-9]+(\.[0-9]+)?$' then (saved_filters->>'maxPrice')::numeric else null end;
  min_trust numeric := case when coalesce(saved_filters->>'minSellerTrust', '') ~ '^[0-9]+(\.[0-9]+)?$' then (saved_filters->>'minSellerTrust')::numeric else null end;
  seller_trust numeric;
  category_filter text := nullif(saved_filters->>'category', '');
  condition_filter text := nullif(saved_filters->>'condition', '');
  location_filter text := lower(nullif(saved_filters->>'location', ''));
  pickup_filter boolean := case when lower(coalesce(saved_filters->>'pickup_available', '')) in ('true', 'false') then (saved_filters->>'pickup_available')::boolean else null end;
begin
  select coalesce(seller_score, score, 0) into seller_trust from public.trust_scores where user_id = target_listing.seller_id;

  return target_listing.status = 'active'
    and target_listing.deleted_at is null
    and (saved_query is null or saved_query = '' or target_listing.search_vector @@ websearch_to_tsquery('english', saved_query))
    and (category_filter is null or category_filter = coalesce((select slug::text from public.categories where id = target_listing.category_id), target_listing.metadata->>'category_slug'))
    and (min_price is null or target_listing.price_amount >= min_price)
    and (max_price is null or target_listing.price_amount <= max_price)
    and (condition_filter is null or target_listing.condition = any(string_to_array(condition_filter, ',')))
    and (location_filter is null or lower(concat_ws(' ', target_listing.location_city, target_listing.location_region, target_listing.location_country)) like '%' || location_filter || '%')
    and (pickup_filter is null or target_listing.pickup_available = pickup_filter)
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
    select
      ss.*,
      jsonb_build_object(
        'saved_search_id', ss.id,
        'listing_id', target_listing.id,
        'query', ss.query,
        'filters', ss.filters,
        'alert_frequency', ss.alert_frequency
      ) as alert_payload,
      (
        'in_app' = any(ss.delivery_channels)
        and (
          ss.last_notified_at is null
          or ss.last_notified_at <= now() - make_interval(mins => greatest(
            ss.min_alert_interval_minutes,
            case ss.alert_frequency when 'daily' then 1440 when 'weekly' then 10080 else 0 end
          ))
        )
      ) as should_notify_now
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
      alert_payload
    from matching
    where should_notify_now
    returning id, user_id, payload
  ), deliveries as (
    insert into public.saved_search_alert_deliveries (saved_search_id, user_id, listing_id, notification_id, payload)
    select m.id, m.user_id, target_listing.id, n.id, m.alert_payload
    from matching m
    left join notifications_inserted n on (n.payload->>'saved_search_id')::uuid = m.id
    on conflict (saved_search_id, listing_id) do nothing
    returning saved_search_id, notification_id
  )
  select count(*) into inserted_count from deliveries;

  update public.saved_searches ss
  set last_checked_at = now(),
      last_notified_at = case when exists (
        select 1 from public.saved_search_alert_deliveries d
        where d.saved_search_id = ss.id and d.listing_id = target_listing.id and d.notification_id is not null
      ) then now() else ss.last_notified_at end,
      updated_at = now()
  where exists (select 1 from public.saved_search_alert_deliveries d where d.saved_search_id = ss.id and d.listing_id = target_listing.id);

  return inserted_count;
end;
$$;

create index if not exists saved_searches_in_app_alerts_idx
  on public.saved_searches(alert_enabled, alert_frequency, last_notified_at)
  where alert_enabled and alert_frequency <> 'never' and delivery_channels @> array['in_app']::text[];

comment on policy favorites_owner_crud on public.favorites is 'Users can create, read, and delete only their own favorite listing rows; admins retain platform access.';
comment on policy saved_searches_owner_crud on public.saved_searches is 'Users can create, read, update, and delete only their own saved searches and alert preferences; admins retain platform access.';
comment on policy saved_search_alert_deliveries_owner_read on public.saved_search_alert_deliveries is 'Users can read only their own saved-search match delivery history; writes are reserved for platform alert jobs.';
comment on policy notifications_owner_crud on public.notifications is 'Users can manage only their own in-app notifications, including saved-search match alerts; admins retain platform access.';

grant execute on function public.saved_search_matches_listing(jsonb, text, public.listings) to service_role;
grant execute on function public.enqueue_saved_search_alerts_for_listing(uuid) to service_role;

commit;
