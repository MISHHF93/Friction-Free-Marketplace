create table if not exists public.trust_scores (
  user_id uuid primary key references public.users(id) on delete cascade,
  score numeric(5,2) not null default 50,
  seller_score numeric(5,2) not null default 50,
  buyer_score numeric(5,2) not null default 50,
  completed_transactions integer not null default 0,
  review_count integer not null default 0,
  fraud_risk_level text not null default 'low' check (fraud_risk_level in ('low', 'medium', 'high', 'critical')),
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.listing_search_documents as
select
  l.id::text as id,
  l.title,
  l.description,
  l.category_id::text as category_id,
  coalesce(c.slug, l.metadata->>'category_slug', 'other') as category_slug,
  coalesce(c.name, initcap(replace(coalesce(l.metadata->>'category_slug', 'other'), '-', ' '))) as category_name,
  coalesce(l.condition, 'Unspecified') as condition,
  l.status::text as status,
  l.price_amount::double precision as price_amount,
  l.currency,
  l.location_city,
  l.location_region,
  l.location_country,
  concat_ws(', ', l.location_city, l.location_region, l.location_country) as location_label,
  nullif(l.metadata #>> '{location,latitude}', '')::double precision as latitude,
  nullif(l.metadata #>> '{location,longitude}', '')::double precision as longitude,
  l.pickup_available,
  l.ships_to,
  l.seller_id::text as seller_id,
  coalesce(p.display_name, p.username, u.email, 'Verified seller') as seller_display_name,
  coalesce(ts.seller_score, ts.score, 50)::double precision as seller_trust_score,
  coalesce(ts.completed_transactions, 0) as seller_completed_transactions,
  coalesce(ts.fraud_risk_level, 'low') as seller_fraud_risk_level,
  img.public_url as image_url,
  case
    when jsonb_typeof(l.metadata->'seo_tags') = 'array'
      then array(select jsonb_array_elements_text(l.metadata->'seo_tags'))
    else '{}'::text[]
  end as seo_tags,
  case
    when jsonb_typeof(l.metadata->'attributes') = 'array'
      then array(select jsonb_array_elements_text(l.metadata->'attributes'))
    when jsonb_typeof(l.metadata #> '{ai_listing,attributes}') = 'array'
      then array(select jsonb_array_elements_text(l.metadata #> '{ai_listing,attributes}'))
    else '{}'::text[]
  end as attributes,
  coalesce((l.metadata->>'view_count')::integer, 0) as view_count,
  coalesce((l.metadata->>'saved_count')::integer, 0) as saved_count,
  coalesce((l.metadata->>'purchase_count')::integer, 0) as purchase_count,
  (
    coalesce((l.metadata->>'view_count')::double precision, 0) * 0.20 +
    coalesce((l.metadata->>'saved_count')::double precision, 0) * 0.50 +
    extract(epoch from greatest(coalesce(l.published_at, l.created_at), now() - interval '30 days')) / extract(epoch from now()) * 20
  ) as trend_score,
  greatest(0, least(100, coalesce(ts.seller_score, ts.score, 50)::double precision - (l.price_amount::double precision / 1000))) as value_score,
  greatest(0, least(100, coalesce(ts.seller_score, ts.score, 50)::double precision - case coalesce(ts.fraud_risk_level, 'low') when 'critical' then 45 when 'high' then 30 when 'medium' then 12 else 0 end)) as safety_score,
  greatest(0, least(100, coalesce(ts.seller_score, ts.score, 50)::double precision + coalesce((l.metadata->>'saved_count')::double precision, 0) * 0.15)) as conversion_score,
  l.published_at,
  l.created_at,
  l.updated_at
from public.listings l
left join public.categories c on c.id = l.category_id
left join public.profiles p on p.user_id = l.seller_id
left join public.users u on u.id = l.seller_id
left join public.trust_scores ts on ts.user_id = l.seller_id
left join lateral (
  select li.public_url
  from public.listing_images li
  where li.listing_id = l.id and li.status = 'ready'
  order by li.sort_order asc, li.created_at asc
  limit 1
) img on true
where l.deleted_at is null;
