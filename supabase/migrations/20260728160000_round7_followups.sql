-- Follow-ups that must not rewrite 20260728150000 while that file is still unmerged.
-- Confirmation sets the privilege flag only for the pending-to-active update.
-- Dispute claims can serialize an authorized payment before it is captured.
-- Self-service user inserts stay limited to a pending buyer.

begin;

create or replace function public.activate_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null)
    or (old.phone_confirmed_at is null and new.phone_confirmed_at is not null) then
    perform set_config('app.allow_privileged_user_update', 'on', true);
    update public.users
      set status = 'active'::public.user_status,
          last_sign_in_at = coalesce(new.last_sign_in_at, last_sign_in_at),
          updated_at = now()
      where id = new.id and status = 'pending'::public.user_status;
    perform set_config('app.allow_privileged_user_update', 'off', true);
  end if;
  return new;
end;
$$;

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

  if payment.id is null
     or payment.status not in ('held', 'authorized', 'capturing')
     or txn.status <> 'disputed' then
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

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert
  with check (
    id = auth.uid()
    and role = 'buyer'
    and status = 'pending'
  );

commit;
