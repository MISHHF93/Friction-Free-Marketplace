-- Remove personal account data without breaking retained commerce and ledger records.

begin;

alter table public.users drop constraint if exists users_email_or_phone;
alter table public.users
  add constraint users_email_or_phone
  check (status = 'deleted' or email is not null or phone is not null);

create or replace function public.anonymize_marketplace_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
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

revoke all on function public.anonymize_marketplace_account(uuid) from public;
revoke all on function public.anonymize_marketplace_account(uuid) from anon;
revoke all on function public.anonymize_marketplace_account(uuid) from authenticated;
grant execute on function public.anonymize_marketplace_account(uuid) to service_role;

commit;
