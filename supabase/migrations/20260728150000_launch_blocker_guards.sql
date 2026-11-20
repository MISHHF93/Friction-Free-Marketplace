-- Launch blockers that cannot be fixed by editing applied migrations.
-- Open checkout includes resolving. Privilege updates from confirmation,
-- deletion, and narrowed staff ranks go through this trigger. Escrow claims
-- lock the transaction before the payment.

begin;

drop index if exists public.transactions_one_open_checkout_per_listing_idx;
create unique index transactions_one_open_checkout_per_listing_idx
  on public.transactions (listing_id)
  where status in (
    'pending_payment',
    'paid',
    'escrowed',
    'shipped',
    'delivered',
    'disputed',
    'resolving'
  );

drop index if exists public.transactions_open_offer_uidx;
create unique index transactions_open_offer_uidx
  on public.transactions (offer_id)
  where offer_id is not null
    and status in (
      'pending_payment',
      'paid',
      'escrowed',
      'shipped',
      'delivered',
      'disputed',
      'resolving'
    );

create or replace function public.admin_role_rank(p_role public.user_role, p_metadata jsonb)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when p_role = 'super_admin' then 5
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') in ('support', 'analyst') then 1
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') in ('moderator', 'finance') then 2
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') = 'risk' then 3
    when p_role = 'admin' then 4
    else 0
  end;
$$;

create or replace function public.guard_user_privilege_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is not distinct from old.status
     and new.role is not distinct from old.role
     and new.metadata is not distinct from old.metadata then
    return new;
  end if;

  -- Email or phone confirmation is the only non-admin status move.
  if old.status = 'pending'
     and new.status = 'active'
     and new.role is not distinct from old.role
     and new.metadata is not distinct from old.metadata then
    return new;
  end if;

  if coalesce(current_setting('app.allow_privileged_user_update', true), '') <> 'on' then
    raise exception 'Status, role, and metadata can only change through an admin RPC.' using errcode = '42501';
  end if;
  if auth.uid() is not null and auth.uid() = old.id then
    raise exception 'You cannot change your own account.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.activate_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.allow_privileged_user_update', 'on', true);
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null)
    or (old.phone_confirmed_at is null and new.phone_confirmed_at is not null) then
    update public.users
      set status = 'active'::public.user_status,
          last_sign_in_at = coalesce(new.last_sign_in_at, last_sign_in_at),
          updated_at = now()
      where id = new.id and status = 'pending'::public.user_status;
  end if;
  return new;
end;
$$;

create or replace function public.anonymize_marketplace_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.allow_privileged_user_update', 'on', true);
  if target_user_id is null then
    raise exception 'Account id is required';
  end if;

  delete from public.addresses where user_id = target_user_id;
  delete from public.favorites where user_id = target_user_id;
  delete from public.saved_searches where user_id = target_user_id;
  delete from public.notification_preferences where user_id = target_user_id;
  delete from public.notifications where user_id = target_user_id;

  update public.profiles
  set
    display_name = 'Deleted marketplace member',
    username = null,
    bio = null,
    avatar_url = null,
    banner_url = null,
    location_label = null,
    website_url = null,
    seller_headline = null,
    preferences = '{}'::jsonb,
    updated_at = now()
  where user_id = target_user_id;

  update public.users
  set
    email = null,
    phone = null,
    status = 'deleted',
    metadata = jsonb_build_object('account_deleted', true),
    deleted_at = now(),
    updated_at = now()
  where id = target_user_id;

  update public.listings
  set
    status = 'removed',
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where seller_id = target_user_id
    and status not in ('sold', 'removed');
end;
$$;

revoke all on function public.anonymize_marketplace_account(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_marketplace_account(uuid) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_display_name text;
  member_name text;
  chosen_display_name text;
begin
  perform set_config('app.allow_privileged_user_update', 'on', true);
  requested_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), '');
  member_name := 'Member ' || upper(substr(replace(new.id::text, '-', ''), 1, 4));
  if requested_display_name is null
     or requested_display_name ~ '@'
     or requested_display_name ~* '(^|[^a-z])(admin|support)([^a-z]|$)' then
    chosen_display_name := member_name;
  else
    chosen_display_name := left(requested_display_name, 80);
  end if;

  insert into public.users (id, email, phone, role, status, metadata)
  values (
    new.id,
    new.email,
    new.phone,
    'buyer',
    case when new.email_confirmed_at is null and new.phone_confirmed_at is null then 'pending'::public.user_status else 'active'::public.user_status end,
    jsonb_build_object('signup_source', 'supabase_auth')
  )
  on conflict (id) do update
    set email = excluded.email,
        phone = excluded.phone,
        updated_at = now();

  insert into public.profiles (user_id, display_name, locale)
  values (new.id, chosen_display_name, 'en')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.claim_escrow_payment(
  p_payment_id uuid,
  p_from public.payment_status,
  p_to public.payment_status
)
returns public.escrow_payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment public.escrow_payments;
  txn public.transactions;
  txn_id uuid;
  claimed public.escrow_payments;
begin
  select transaction_id into txn_id from public.escrow_payments where id = p_payment_id;
  if txn_id is null then
    return null;
  end if;
  select * into txn from public.transactions where id = txn_id for update;
  select * into payment from public.escrow_payments where id = p_payment_id for update;
  if payment.id is null then
    return null;
  end if;

  if not (
    (p_from = 'requires_action' and p_to in ('authorized', 'cancelled', 'failed'))
    or (p_from = 'authorized' and p_to in ('capturing', 'refunding', 'cancelled'))
    or (p_from = 'capturing' and p_to in ('held', 'authorized', 'cancelled'))
    or (p_from = 'held' and p_to in ('releasing', 'refunding'))
    or (p_from = 'releasing' and p_to in ('released', 'held', 'authorized', 'cancelled'))
    or (p_from = 'refunding' and p_to in ('refunded', 'held', 'cancelled', 'authorized'))
  ) then
    return null;
  end if;

  if p_to = 'releasing' and txn.id is not null and txn.status = 'disputed' then
    return null;
  end if;

  update public.escrow_payments
    set status = p_to,
        updated_at = now()
    where id = p_payment_id
      and status = p_from
    returning * into claimed;
  return claimed;
end;
$$;

revoke all on function public.claim_escrow_payment(uuid, public.payment_status, public.payment_status) from public, anon, authenticated;
grant execute on function public.claim_escrow_payment(uuid, public.payment_status, public.payment_status) to service_role;

create or replace function public.claim_dispute_settlement(
  p_dispute_id uuid,
  p_plan jsonb
)
returns public.disputes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dispute public.disputes;
  payment public.escrow_payments;
  txn public.transactions;
  txn_id uuid;
begin
  select transaction_id into txn_id from public.disputes where id = p_dispute_id;
  if txn_id is null then
    return null;
  end if;
  select * into txn from public.transactions where id = txn_id for update;
  select * into payment from public.escrow_payments where transaction_id = txn.id for update;
  select * into dispute from public.disputes where id = p_dispute_id for update;
  if dispute.id is null then
    return null;
  end if;

  if dispute.status = 'resolving' or dispute.status in ('closed', 'resolved_buyer', 'resolved_seller') then
    return dispute;
  end if;

  if dispute.status not in ('opened', 'awaiting_buyer', 'awaiting_seller', 'under_review') then
    return null;
  end if;

  if payment.id is null or payment.status <> 'held' or txn.status <> 'disputed' then
    return null;
  end if;

  update public.disputes
    set status = 'resolving',
        settlement_plan = p_plan,
        updated_at = now()
    where id = dispute.id
      and status in ('opened', 'awaiting_buyer', 'awaiting_seller', 'under_review')
    returning * into dispute;

  update public.transactions
    set status = 'resolving',
        updated_at = now()
    where id = txn.id
      and status = 'disputed';

  return dispute;
end;
$$;

revoke all on function public.claim_dispute_settlement(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_dispute_settlement(uuid, jsonb) to service_role;

create or replace function public.admin_set_user_status(
  p_admin_id uuid,
  p_user_id uuid,
  p_status public.user_status,
  p_reason text,
  p_restriction_type text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor public.users%rowtype;
  old_row jsonb;
  new_row jsonb;
  action_id uuid;
  actor_rank integer;
  target_rank integer;
begin
  perform set_config('app.allow_privileged_user_update', 'on', true);

  if p_admin_id = p_user_id then
    raise exception 'You cannot change your own account.' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'A reason is required.' using errcode = '22023';
  end if;

  select * into actor from public.users where id = p_admin_id;
  if actor.id is null then
    raise exception 'Actor not found.' using errcode = '42501';
  end if;

  select to_jsonb(u) into old_row from public.users u where u.id = p_user_id for update;
  if old_row is null then
    raise exception 'User not found';
  end if;

  actor_rank := public.admin_role_rank(actor.role, actor.metadata);
  target_rank := public.admin_role_rank((old_row->>'role')::public.user_role, coalesce(old_row->'metadata', '{}'::jsonb));
  if actor_rank < 3 or target_rank >= actor_rank then
    raise exception 'You cannot change this account.' using errcode = '42501';
  end if;

  update public.users
  set status = p_status,
      banned_reason = case when p_status = 'banned' then p_reason else banned_reason end,
      updated_at = now()
  where id = p_user_id
  returning jsonb_build_object('id', id, 'email', email, 'role', role, 'status', status, 'banned_reason', banned_reason, 'metadata', metadata, 'updated_at', updated_at) into new_row;

  if p_status in ('suspended', 'banned') then
    update public.listings
      set status = 'paused',
          metadata = metadata || jsonb_build_object('paused_by', 'admin_restriction'),
          updated_at = now()
      where seller_id = p_user_id and status = 'active';
    update public.transactions
      set status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      where (buyer_id = p_user_id or seller_id = p_user_id)
        and status = 'pending_payment';
  elsif p_status = 'active' then
    update public.listings
      set status = 'active',
          metadata = metadata - 'paused_by',
          updated_at = now()
      where seller_id = p_user_id
        and status = 'paused'
        and metadata->>'paused_by' = 'admin_restriction';
  end if;

  if p_restriction_type is not null then
    insert into public.user_restrictions (user_id, created_by, restriction_type, reason, expires_at)
    values (p_user_id, p_admin_id, p_restriction_type, p_reason, p_expires_at);
  end if;

  action_id := public.record_admin_action(p_admin_id, 'user.status_change', 'users', p_user_id, p_reason, old_row, new_row, jsonb_build_object('status', p_status));
  return action_id;
end;
$$;

revoke all on function public.admin_set_user_status(uuid, uuid, public.user_status, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_set_user_status(uuid, uuid, public.user_status, text, text, timestamptz) to service_role;

revoke insert, update, delete on public.contact_messages from anon, authenticated;

commit;
