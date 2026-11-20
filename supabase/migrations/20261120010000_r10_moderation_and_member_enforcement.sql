-- r10 batch B: listing moderation holds sellers cannot undo, suspended or
-- banned members cannot write, listings in an open order cannot be sold,
-- archived or removed by the seller, offers close when the listing goes away,
-- one admin listing-decision path, and suspensions lift when they expire.
-- Forward-only and non-destructive: adds functions and triggers, replaces two
-- function bodies, and changes no existing rows.

begin;

-- ---------------------------------------------------------------------------
-- Member status helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_user_is_restricted()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status in ('suspended', 'banned', 'deleted')
  );
$$;

revoke all on function public.current_user_is_restricted() from public, anon;
grant execute on function public.current_user_is_restricted() to authenticated, service_role;

create or replace function public.listing_has_open_order(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.transactions t
    where t.listing_id = p_listing_id
      and t.status::text in ('pending_payment', 'paid', 'escrowed', 'shipped', 'delivered', 'disputed', 'resolving')
  );
$$;

revoke all on function public.listing_has_open_order(uuid) from public, anon;
grant execute on function public.listing_has_open_order(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Restricted members cannot write marketplace content (covers RLS writes and
-- security-definer RPCs, because auth.uid() is still the caller).
-- Service-role jobs (auth.uid() is null) and admins are not affected.
-- ---------------------------------------------------------------------------

create or replace function public.block_restricted_member_writes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;
  if public.current_user_is_restricted() then
    raise exception 'account_restricted: this account is suspended or banned and cannot make changes'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'offers', 'messages', 'conversations', 'reviews', 'listing_images',
    'message_attachments', 'pickup_schedules', 'reservation_deposits'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop trigger if exists block_restricted_member_writes on public.%I', table_name);
      execute format('create trigger block_restricted_member_writes before insert or update on public.%I for each row execute function public.block_restricted_member_writes()', table_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Listing guard: what a seller may change on their own listing.
-- Moderation keys (moderation_hold, paused_by, moderation_reason) are
-- server-owned, sellers cannot self-approve, holds block publishing, and a
-- listing in an open order cannot be sold, archived, paused or removed.
-- ---------------------------------------------------------------------------

create or replace function public.guard_listing_member_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hold text;
  old_moderation text;
  new_moderation text;
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if public.current_user_is_restricted() then
    raise exception 'account_restricted: this account is suspended or banned and cannot change listings'
      using errcode = '42501';
  end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb);

  if tg_op = 'INSERT' then
    new.metadata := new.metadata - 'moderation_hold' - 'paused_by' - 'moderation_reason';
    if new.metadata->>'moderation_status' in ('approved', 'rejected') then
      new.metadata := jsonb_set(new.metadata, '{moderation_status}', '"pending"'::jsonb);
    end if;
    if new.status::text not in ('draft', 'active') then
      raise exception 'listing_invalid_status: new listings start as a draft or published'
        using errcode = '23514';
    end if;
    return new;
  end if;

  -- Server-owned moderation keys always keep their stored value.
  new.metadata := (new.metadata - 'moderation_hold' - 'paused_by' - 'moderation_reason')
    || jsonb_strip_nulls(jsonb_build_object(
      'moderation_hold', old.metadata->'moderation_hold',
      'paused_by', old.metadata->'paused_by',
      'moderation_reason', old.metadata->'moderation_reason'
    ));

  old_moderation := old.metadata->>'moderation_status';
  new_moderation := new.metadata->>'moderation_status';
  if new_moderation is distinct from old_moderation
     and (old_moderation in ('needs_review', 'rejected', 'approved') or new_moderation in ('approved', 'rejected')) then
    new.metadata := jsonb_set(new.metadata, '{moderation_status}', coalesce(old.metadata->'moderation_status', '"pending"'::jsonb));
  end if;

  if old.deleted_at is not null or old.status::text = 'removed' then
    raise exception 'listing_removed: removed listings cannot be changed'
      using errcode = '23514';
  end if;

  if new.status is not distinct from old.status and new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  hold := coalesce(old.metadata->>'moderation_hold', old.metadata->>'paused_by');

  if new.status::text = 'active' then
    if hold is not null then
      raise exception 'listing_on_hold: this listing is on hold for review and cannot be published'
        using errcode = '42501';
    end if;
    if old.status::text not in ('draft', 'paused', 'archived', 'expired') then
      raise exception 'listing_invalid_transition: cannot publish from %', old.status
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.status::text = 'reserved' or new.status::text = 'expired' then
    raise exception 'listing_invalid_transition: % is set by the marketplace', new.status
      using errcode = '23514';
  end if;

  if public.listing_has_open_order(old.id) then
    raise exception 'listing_has_open_order: finish or cancel the open order first'
      using errcode = '23514';
  end if;

  if old.status::text = 'sold' and new.status::text <> 'archived' then
    raise exception 'listing_invalid_transition: sold listings can only be archived'
      using errcode = '23514';
  end if;

  if new.deleted_at is not null and new.status::text <> 'removed' then
    raise exception 'listing_invalid_transition: deleting a listing removes it'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_listing_member_change on public.listings;
create trigger guard_listing_member_change
before insert or update on public.listings
for each row execute function public.guard_listing_member_change();

-- ---------------------------------------------------------------------------
-- Pending offers close when the listing stops being available.
-- ---------------------------------------------------------------------------

create or replace function public.expire_offers_for_unavailable_listing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status::text in ('sold', 'archived', 'removed', 'paused', 'expired')
     and old.status is distinct from new.status then
    update public.offers
      set status = 'expired',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('transition_reason', 'listing_unavailable', 'listing_status', new.status::text)
      where listing_id = new.id
        and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists expire_offers_for_unavailable_listing on public.listings;
create trigger expire_offers_for_unavailable_listing
after update of status on public.listings
for each row execute function public.expire_offers_for_unavailable_listing();

-- Catch-up for offers already stranded on unavailable listings (status change only).
create or replace function public.expire_offers_on_unavailable_listings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  update public.offers o
    set status = 'expired',
        metadata = coalesce(o.metadata, '{}'::jsonb) || jsonb_build_object('transition_reason', 'listing_unavailable')
    from public.listings l
    where l.id = o.listing_id
      and o.status = 'pending'
      and (l.status::text in ('sold', 'archived', 'removed', 'paused', 'expired') or l.deleted_at is not null);
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.expire_offers_on_unavailable_listings() from public, anon, authenticated;
grant execute on function public.expire_offers_on_unavailable_listings() to service_role;

-- ---------------------------------------------------------------------------
-- One admin listing-decision path with state checks.
-- approve: clears holds, republishes a held draft/paused listing.
-- hold:    pauses with an admin hold the seller cannot lift.
-- reject:  removes the listing (not allowed while an order is open).
-- The old body wrote the raw decision into moderation_status, which the
-- metadata check constraint rejects; this maps decisions to allowed values.
-- ---------------------------------------------------------------------------

create or replace function public.admin_record_listing_decision(
  p_admin_id uuid,
  p_listing_id uuid,
  p_decision text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing public.listings%rowtype;
  old_row jsonb;
  new_row jsonb;
  decision text := case when p_decision in ('remove', 'reject') then 'reject' else p_decision end;
  next_status public.listing_status;
  next_metadata jsonb;
  had_hold boolean;
  action_id uuid;
begin
  if decision not in ('approve', 'hold', 'reject') then
    raise exception 'Unknown listing decision %', p_decision using errcode = '22023';
  end if;

  select * into existing from public.listings where id = p_listing_id for update;
  if existing.id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  old_row := to_jsonb(existing);
  next_metadata := coalesce(existing.metadata, '{}'::jsonb);
  had_hold := coalesce(next_metadata->>'moderation_hold', next_metadata->>'paused_by') is not null;

  if existing.status::text = 'removed' and decision <> 'reject' then
    raise exception 'listing_removed: removed listings cannot be approved or held' using errcode = '23514';
  end if;

  if decision = 'approve' then
    next_status := case
      when existing.status::text in ('draft', 'paused') and had_hold then 'active'::public.listing_status
      else existing.status
    end;
    next_metadata := (next_metadata - 'moderation_hold' - 'paused_by')
      || jsonb_build_object('moderation_status', 'approved', 'moderation_reason', p_reason);
  elsif decision = 'hold' then
    if existing.status::text in ('reserved', 'sold') or public.listing_has_open_order(existing.id) then
      raise exception 'listing_has_open_order: a listing in an order cannot be put on hold' using errcode = '23514';
    end if;
    next_status := case when existing.status::text in ('active', 'paused', 'draft', 'expired') then 'paused'::public.listing_status else existing.status end;
    next_metadata := next_metadata
      || jsonb_build_object('moderation_status', 'needs_review', 'moderation_hold', 'admin_hold', 'paused_by', 'admin_hold', 'moderation_reason', p_reason);
  else
    if public.listing_has_open_order(existing.id) then
      raise exception 'listing_has_open_order: refund or settle the open order before removing this listing' using errcode = '23514';
    end if;
    next_status := 'removed'::public.listing_status;
    next_metadata := next_metadata
      || jsonb_build_object('moderation_status', 'rejected', 'moderation_hold', 'admin_reject', 'moderation_reason', p_reason);
  end if;

  update public.listings
  set status = next_status,
      metadata = next_metadata,
      deleted_at = case when decision = 'reject' then coalesce(deleted_at, now()) else deleted_at end,
      published_at = case when next_status::text = 'active' then coalesce(published_at, now()) else published_at end,
      updated_at = now()
  where id = p_listing_id
  returning jsonb_build_object('id', id, 'seller_id', seller_id, 'title', title, 'status', status, 'metadata', metadata, 'updated_at', updated_at) into new_row;

  action_id := public.record_admin_action(p_admin_id, 'listing.moderation_decision', 'listings', p_listing_id, p_reason, old_row, new_row, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('decision', decision));
  return action_id;
end;
$$;

revoke all on function public.admin_record_listing_decision(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_record_listing_decision(uuid, uuid, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Suspensions with an end date lift on their own. Bans never lift here.
-- ---------------------------------------------------------------------------

create or replace function public.lift_expired_suspensions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lifted integer := 0;
  member record;
begin
  perform set_config('app.allow_privileged_user_update', 'on', true);
  for member in
    select u.id
    from public.users u
    where u.status = 'suspended'
      and exists (
        select 1 from public.user_restrictions r
        where r.user_id = u.id and r.status = 'active' and r.revoked_at is null and r.expires_at is not null and r.expires_at <= now()
      )
      and not exists (
        select 1 from public.user_restrictions r
        where r.user_id = u.id and r.status = 'active' and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())
      )
  loop
    update public.users set status = 'active', updated_at = now() where id = member.id and status = 'suspended';
    update public.listings
      set status = 'active',
          metadata = metadata - 'paused_by',
          updated_at = now()
      where seller_id = member.id
        and status = 'paused'
        and metadata->>'paused_by' = 'admin_restriction'
        and metadata->>'moderation_hold' is null;
    update public.user_restrictions
      set status = 'expired', updated_at = now()
      where user_id = member.id and status = 'active' and revoked_at is null and expires_at <= now();
    lifted := lifted + 1;
  end loop;
  return lifted;
end;
$$;

revoke all on function public.lift_expired_suspensions() from public, anon, authenticated;
grant execute on function public.lift_expired_suspensions() to service_role;

commit;
