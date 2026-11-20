-- Refund rollback, dispute/release lock, and ban hierarchy.
-- Additive: replaces functions only. Does not edit earlier migrations.

begin;

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
  claimed public.escrow_payments;
begin
  if not (
    (p_from = 'requires_action' and p_to in ('authorized', 'cancelled', 'failed'))
    or (p_from = 'authorized' and p_to in ('capturing', 'refunding', 'cancelled'))
    or (p_from = 'capturing' and p_to in ('held', 'authorized'))
    or (p_from = 'held' and p_to in ('releasing', 'refunding'))
    or (p_from = 'releasing' and p_to in ('released', 'held'))
    or (p_from = 'refunding' and p_to in ('refunded', 'held', 'cancelled', 'authorized'))
  ) then
    return null;
  end if;

  if p_to = 'releasing' and exists (
    select 1
    from public.escrow_payments payment
    join public.transactions txn on txn.id = payment.transaction_id
    where payment.id = p_payment_id
      and txn.status = 'disputed'
  ) then
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

create or replace function public.guard_dispute_payment(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment public.escrow_payments;
begin
  select * into payment
  from public.escrow_payments
  where transaction_id = p_transaction_id
  for update;
  if payment.id is null then
    return true;
  end if;
  return payment.status = 'held';
end;
$$;

revoke all on function public.guard_dispute_payment(uuid) from public, anon, authenticated;
grant execute on function public.guard_dispute_payment(uuid) to service_role;

create or replace function public.admin_role_rank(p_role public.user_role, p_metadata jsonb)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when p_role = 'super_admin' then 5
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') = 'risk' then 3
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') in ('moderator', 'finance') then 2
    when p_role = 'admin' and coalesce(p_metadata->>'admin_role', '') in ('support', 'analyst') then 1
    when p_role = 'admin' then 4
    else 0
  end;
$$;

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
  if target_rank >= actor_rank then
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

commit;
