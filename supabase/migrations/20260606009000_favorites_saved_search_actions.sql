-- Favorites and saved-search operational hooks.
-- Adds engagement counters for favorites and automatically enqueues saved-search
-- notifications when an active listing is published or updated into a matching state.

begin;

create or replace function public.update_listing_saved_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.listing_discovery_stats (listing_id, saved_count, last_saved_at, trend_score)
    values (new.listing_id, 1, now(), 1.5)
    on conflict (listing_id) do update set
      saved_count = public.listing_discovery_stats.saved_count + 1,
      last_saved_at = now(),
      trend_score = public.listing_discovery_stats.trend_score + 1.5,
      updated_at = now();
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.listing_discovery_stats
    set saved_count = greatest(saved_count - 1, 0),
        trend_score = greatest(trend_score - 1.5, 0),
        updated_at = now()
    where listing_id = old.listing_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists favorites_update_listing_saved_count on public.favorites;
create trigger favorites_update_listing_saved_count
after insert or delete on public.favorites
for each row execute function public.update_listing_saved_count();

create or replace function public.enqueue_saved_search_alerts_on_listing_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' or new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.enqueue_saved_search_alerts_for_listing(new.id);
    return new;
  end if;

  if old.status is distinct from new.status
    or old.published_at is distinct from new.published_at then
    perform public.enqueue_saved_search_alerts_for_listing(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists listings_enqueue_saved_search_alerts on public.listings;
create trigger listings_enqueue_saved_search_alerts
after insert or update of status, published_at, deleted_at on public.listings
for each row execute function public.enqueue_saved_search_alerts_on_listing_change();

grant execute on function public.update_listing_saved_count() to authenticated, service_role;
grant execute on function public.enqueue_saved_search_alerts_on_listing_change() to service_role;

create index if not exists favorites_user_created_idx on public.favorites(user_id, created_at desc);
create index if not exists saved_searches_user_updated_idx on public.saved_searches(user_id, updated_at desc);
create index if not exists notifications_saved_search_match_idx on public.notifications(user_id, type, read_at, created_at desc) where type = 'saved_search_match';

commit;
