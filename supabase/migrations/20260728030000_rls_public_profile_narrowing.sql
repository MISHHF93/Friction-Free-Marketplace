-- Narrow three overly broad policies and publish profiles without private preferences.
-- Dropping and recreating policies is intentional. No tables or columns are removed.

begin;

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert
  with check (
    id = auth.uid()
    and role = 'buyer'
    and status = 'pending'
  );

drop policy if exists offers_participant_update on public.offers;

-- Offer status changes go through the negotiation RPC, which must bypass the
-- missing participant UPDATE policy. Direct table updates stay denied.
alter function public.respond_to_negotiation_offer(uuid, public.offer_status, text) security definer;

drop policy if exists reviews_participant_insert on public.reviews;
create policy reviews_participant_insert on public.reviews
  for insert
  with check (
    public.current_user_is_admin()
    or (
      reviewer_id = auth.uid()
      and exists (
        select 1
        from public.transactions as transaction
        where transaction.id = transaction_id
          and transaction.status = 'completed'
          and auth.uid() in (transaction.buyer_id, transaction.seller_id)
          and reviewee_id in (transaction.buyer_id, transaction.seller_id)
          and reviewee_id <> reviewer_id
      )
    )
  );

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_owner_or_admin_read on public.profiles
  for select
  using (user_id = auth.uid() or public.current_user_is_admin());

create or replace view public.public_profiles as
select
  user_id,
  display_name,
  username,
  bio,
  avatar_url,
  banner_url,
  location_label,
  website_url,
  seller_headline,
  response_time_minutes,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated, service_role;

commit;
