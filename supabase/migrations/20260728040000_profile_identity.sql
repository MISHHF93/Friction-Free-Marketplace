-- One profile row per auth user. Old profile-like values in users.metadata stay
-- in place and are marked deprecated. No columns or tables are dropped.

begin;

alter table public.profiles
  add column if not exists locale text not null default 'en';

comment on column public.profiles.locale is
  'Preferred interface locale. The shipped catalog is English (en).';
comment on column public.users.metadata is
  'Deprecated for profile fields. Display name, username, and locale belong on public.profiles.';

insert into public.profiles (user_id, display_name, locale)
select
  users.id,
  case
    when length(left(split_part(coalesce(users.email::text, 'member'), '@', 1), 80)) >= 2
      then left(split_part(coalesce(users.email::text, 'member'), '@', 1), 80)
    else 'Marketplace member'
  end,
  'en'
from public.users as users
left join public.profiles as profiles on profiles.user_id = users.id
where profiles.user_id is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_display_name text;
  fallback_display_name text;
  chosen_display_name text;
begin
  requested_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), '');
  fallback_display_name := split_part(coalesce(new.email, 'member'), '@', 1);
  chosen_display_name := left(coalesce(requested_display_name, fallback_display_name, 'Marketplace member'), 80);
  if length(chosen_display_name) < 2 then
    chosen_display_name := 'Marketplace member';
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

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  using (user_id = auth.uid() or public.current_user_is_admin())
  with check (user_id = auth.uid() or public.current_user_is_admin());

commit;
