-- Provision application user and public profile rows whenever Supabase Auth
-- creates a new auth.users record. This keeps email/password signup safe when
-- email confirmation is enabled and no browser session exists yet.

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_display_name text;
  fallback_display_name text;
begin
  requested_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), '');
  fallback_display_name := split_part(coalesce(new.email, 'Marketplace member'), '@', 1);

  insert into public.users (id, email, phone, status, metadata)
  values (
    new.id,
    new.email,
    new.phone,
    case when new.email_confirmed_at is null and new.phone_confirmed_at is null then 'pending'::public.user_status else 'active'::public.user_status end,
    jsonb_build_object('signup_source', 'supabase_auth')
  )
  on conflict (id) do update
    set email = excluded.email,
        phone = excluded.phone,
        updated_at = now();

  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    case
      when length(left(coalesce(requested_display_name, fallback_display_name, 'Marketplace member'), 80)) >= 2
        then left(coalesce(requested_display_name, fallback_display_name, 'Marketplace member'), 80)
      else 'Marketplace member'
    end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.activate_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at, phone_confirmed_at, last_sign_in_at on auth.users
  for each row execute function public.activate_auth_user_profile();

commit;
