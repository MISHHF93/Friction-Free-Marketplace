-- Complete listing lifecycle architecture: archived status, lifecycle indexes,
-- and an audited database helper for seller-owned status transitions.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'listing_status'
      and e.enumlabel = 'archived'
  ) then
    alter type public.listing_status add value 'archived' after 'paused';
  end if;
end $$;

create index if not exists listings_seller_lifecycle_idx
  on public.listings(seller_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists listings_active_category_price_idx
  on public.listings(category_id, price_amount, published_at desc)
  where status = 'active' and deleted_at is null;

create or replace function public.set_listing_lifecycle_status(
  p_listing_id uuid,
  p_status public.listing_status,
  p_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.listings;
  changed public.listings;
  audit_action text;
  next_metadata jsonb;
begin
  select *
  into existing
  from public.listings
  where id = p_listing_id
    and deleted_at is null
  for update;

  if existing.id is null then
    raise exception 'Listing not found';
  end if;

  if existing.seller_id <> auth.uid() and not public.current_user_is_admin() then
    raise exception 'Listing permission denied';
  end if;

  if existing.status::text = 'removed' then
    raise exception 'Removed listings cannot be changed';
  end if;

  if p_status::text = 'active' and existing.status::text not in ('draft', 'paused', 'archived', 'expired') then
    raise exception 'Listing cannot be published from status %', existing.status;
  end if;

  if p_status::text = 'archived' and existing.status::text not in ('draft', 'active', 'reserved', 'paused', 'expired', 'sold') then
    raise exception 'Listing cannot be archived from status %', existing.status;
  end if;

  if p_status::text = 'sold' and existing.status::text not in ('active', 'reserved') then
    raise exception 'Listing cannot be marked sold from status %', existing.status;
  end if;

  next_metadata = existing.metadata || jsonb_build_object(
    'lifecycle_event', p_status::text,
    'lifecycle_reason', p_reason,
    'lifecycle_changed_at', now()
  );

  update public.listings
  set status = p_status,
      quantity = case when p_status::text = 'sold' then 0 else quantity end,
      published_at = case when p_status::text = 'active' then coalesce(published_at, now()) else published_at end,
      metadata = next_metadata,
      updated_at = now()
  where id = p_listing_id
  returning * into changed;

  audit_action = case p_status::text
    when 'active' then 'listing.publish'
    when 'archived' then 'listing.archive'
    when 'sold' then 'listing.mark_sold'
    when 'removed' then 'listing.delete'
    else 'listing.update'
  end;

  insert into public.audit_logs (
    actor_id,
    actor_type,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  )
  values (
    auth.uid(),
    case when public.current_user_is_admin() then 'admin' else 'user' end,
    audit_action,
    'listings',
    p_listing_id,
    to_jsonb(existing),
    to_jsonb(changed),
    jsonb_build_object(
      'source', 'set_listing_lifecycle_status',
      'reason', p_reason,
      'from_status', existing.status::text,
      'to_status', p_status::text
    )
  );

  return changed;
end;
$$;

grant execute on function public.set_listing_lifecycle_status(uuid, public.listing_status, text) to authenticated;
