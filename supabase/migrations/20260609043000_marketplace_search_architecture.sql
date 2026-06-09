-- Marketplace search architecture: richer Meilisearch documents and
-- analytics indexes for recommendations, trending, and saved-search matching.

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
  l.updated_at,
  array_remove(array[
    l.title,
    l.description,
    coalesce(c.name, l.metadata->>'category_slug'),
    coalesce(p.display_name, 'Verified seller'),
    l.location_city,
    l.location_region
  ], null) ||
    coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(l.metadata->'seo_tags', '[]'::jsonb)) as value), array[]::text[]) ||
    coalesce((select array_agg(la.value order by la.name) from public.listing_attributes la where la.listing_id = l.id), array[]::text[]) as search_terms,
  array_remove(array[
    case when l.pickup_available then 'pickup' end,
    case when cardinality(l.ships_to) > 0 then 'shipping' end,
    case when coalesce(l.metadata->'fulfillment_options', '[]'::jsonb) ? 'local_delivery' then 'local_delivery' end
  ], null) as fulfillment_modes
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

grant select on public.listing_search_documents to anon, authenticated, service_role;

create index if not exists search_events_created_idx
  on public.search_events(created_at desc);

create index if not exists search_events_filters_gin_idx
  on public.search_events using gin(filters);

create index if not exists listing_discovery_stats_conversion_idx
  on public.listing_discovery_stats(conversion_score desc, updated_at desc);
