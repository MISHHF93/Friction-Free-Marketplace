-- r10 batch A: refuse account deletion while the member has open orders or
-- unsettled disputes, so held buyer funds never lose their counterparty.
-- Forward-only: replaces the function body from 20260728150000 with a guard
-- added at the top. No data is changed.

begin;

create or replace function public.account_open_order_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.transactions t
  where (t.buyer_id = p_user_id or t.seller_id = p_user_id)
    and t.status::text in ('pending_payment', 'paid', 'escrowed', 'shipped', 'delivered', 'disputed', 'resolving');
$$;

revoke all on function public.account_open_order_count(uuid) from public, anon, authenticated;
grant execute on function public.account_open_order_count(uuid) to service_role;

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

  if public.account_open_order_count(target_user_id) > 0 then
    raise exception 'account_has_open_orders: finish, cancel or settle open orders before deleting the account'
      using errcode = 'P0001';
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

commit;
