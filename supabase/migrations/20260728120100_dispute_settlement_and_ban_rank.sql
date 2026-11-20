-- Dispute settlement, atomic dispute open, escrow locks, and ban-rank RLS.

begin;

create or replace function public.admin_role_rank(p_role public.user_role, p_metadata jsonb)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when p_role = 'super_admin' then 5
    when p_role = 'admin' then 4
    else 0
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
  claimed public.escrow_payments;
begin
  select * into payment from public.escrow_payments where id = p_payment_id for update;
  if payment.id is null then
    return null;
  end if;
  select * into txn from public.transactions where id = payment.transaction_id for update;

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
begin
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

  select * into txn from public.transactions where id = dispute.transaction_id for update;
  select * into payment from public.escrow_payments where transaction_id = dispute.transaction_id for update;
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

create or replace function public.open_dispute(
  p_transaction_id uuid,
  p_user_id uuid,
  p_reason text,
  p_evidence jsonb default '{}'::jsonb
)
returns public.disputes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  txn public.transactions;
  payment public.escrow_payments;
  created public.disputes;
begin
  if p_reason is null or length(btrim(p_reason)) < 10 then
    raise exception 'A dispute reason is required.' using errcode = '22023';
  end if;

  select * into txn from public.transactions where id = p_transaction_id for update;
  if txn.id is null or p_user_id not in (txn.buyer_id, txn.seller_id) then
    raise exception 'Transaction not found.' using errcode = '42501';
  end if;
  if txn.status not in ('paid', 'escrowed', 'shipped', 'delivered') then
    raise exception 'This order cannot be disputed in its current state.' using errcode = '23514';
  end if;

  select * into payment from public.escrow_payments where transaction_id = txn.id for update;
  if payment.id is null or payment.status not in ('held', 'authorized') then
    raise exception 'A dispute can be opened only while payment is authorized or held.' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.disputes
    where transaction_id = txn.id
      and status in ('opened', 'awaiting_buyer', 'awaiting_seller', 'under_review', 'resolving')
  ) then
    raise exception 'An open dispute already exists for this transaction.' using errcode = '23505';
  end if;

  insert into public.disputes (transaction_id, opened_by_id, respondent_id, reason, status, evidence)
  values (
    txn.id,
    p_user_id,
    case when p_user_id = txn.buyer_id then txn.seller_id else txn.buyer_id end,
    btrim(p_reason),
    'opened',
    coalesce(p_evidence, '{}'::jsonb)
  )
  returning * into created;

  update public.transactions
    set status = 'disputed',
        updated_at = now()
    where id = txn.id
      and status = txn.status;

  return created;
end;
$$;

revoke all on function public.open_dispute(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.open_dispute(uuid, uuid, text, jsonb) to service_role;

create or replace function public.guard_user_privilege_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     or new.role is distinct from old.role
     or new.metadata is distinct from old.metadata then
    if coalesce(current_setting('app.allow_privileged_user_update', true), '') <> 'on' then
      raise exception 'Status, role, and metadata can only change through an admin RPC.' using errcode = '42501';
    end if;
    if auth.uid() is not null and auth.uid() = old.id then
      raise exception 'You cannot change your own account.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_guard_privilege_update on public.users;
create trigger users_guard_privilege_update
  before update on public.users
  for each row
  execute function public.guard_user_privilege_update();

drop policy if exists users_admin_update on public.users;
create policy users_admin_update on public.users
  for update
  using (public.current_user_is_admin())
  with check (
    public.current_user_is_admin()
    and id <> auth.uid()
  );

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

commit;
