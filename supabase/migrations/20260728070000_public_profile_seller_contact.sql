-- Public profile reads stay on this view. Location and website are included
-- only when the account sells. Owner-only RLS on profiles would hide every
-- row if this view used security_invoker, so the view remains the public
-- projection and does not expose preferences.

begin;

create or replace view public.public_profiles as
select
  profiles.user_id,
  profiles.display_name,
  profiles.username,
  profiles.bio,
  profiles.avatar_url,
  profiles.banner_url,
  case when seller.user_id is not null then profiles.location_label else null end as location_label,
  case when seller.user_id is not null then profiles.website_url else null end as website_url,
  profiles.seller_headline,
  profiles.response_time_minutes,
  profiles.created_at
from public.profiles as profiles
left join (
  select distinct listings.seller_id as user_id
  from public.listings as listings
  where listings.deleted_at is null
    and listings.status in ('active', 'reserved', 'sold')
) as seller on seller.user_id = profiles.user_id;

grant select on public.public_profiles to anon, authenticated, service_role;

commit;
