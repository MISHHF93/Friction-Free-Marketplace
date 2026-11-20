-- New accounts get Member #### instead of an email prefix. Existing profiles
-- that still show an email local-part are backfilled the same way.

begin;

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
  chosen_display_name := left(coalesce(requested_display_name, member_name), 80);

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

update public.profiles as profile
set display_name = 'Member ' || upper(substr(replace(profile.user_id::text, '-', ''), 1, 4))
from public.users as account
where account.id = profile.user_id
  and (
    profile.display_name is null
    or btrim(profile.display_name) = ''
    or lower(profile.display_name) = lower(split_part(coalesce(account.email, ''), '@', 1))
  );

alter view if exists public.public_profiles set (security_barrier = true);

commit;
