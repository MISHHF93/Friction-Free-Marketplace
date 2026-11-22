-- r11 P1-3: message and offer notifications were created twice, once by a
-- database trigger and once by the app. Keep the app path, which honours
-- notification preferences and can send email. This migration only drops
-- the leftover triggers and unused functions. No notification rows are
-- changed.

begin;

drop trigger if exists notify_conversation_message on public.messages;
drop trigger if exists notify_offer_change on public.offers;

drop function if exists public.notify_conversation_message();
drop function if exists public.notify_offer_change();

-- Return the offers these jobs close so the expire route can send a single
-- in-app and email notice. The original count-returning functions stay for
-- compatibility.

create or replace function public.expire_due_offers_returning()
returns setof public.offers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.offer_actor_id', '', true);

  return query
  update public.offers
    set status = 'expired',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('transition_reason', 'expiration_job')
    where status = 'pending'
      and expires_at is not null
      and expires_at <= now()
    returning *;
end;
$$;

revoke all on function public.expire_due_offers_returning() from public, anon, authenticated;
grant execute on function public.expire_due_offers_returning() to service_role;

create or replace function public.expire_offers_on_unavailable_listings_returning()
returns setof public.offers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.offers o
    set status = 'expired',
        metadata = coalesce(o.metadata, '{}'::jsonb) || jsonb_build_object('transition_reason', 'listing_unavailable')
    from public.listings l
    where l.id = o.listing_id
      and o.status = 'pending'
      and (l.status::text in ('sold', 'archived', 'removed', 'paused', 'expired') or l.deleted_at is not null)
    returning o.*;
end;
$$;

revoke all on function public.expire_offers_on_unavailable_listings_returning() from public, anon, authenticated;
grant execute on function public.expire_offers_on_unavailable_listings_returning() to service_role;

-- Keep the original count wrappers on top of the returning functions.
create or replace function public.expire_due_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  perform * from public.expire_due_offers_returning();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.expire_offers_on_unavailable_listings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  perform * from public.expire_offers_on_unavailable_listings_returning();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

commit;
