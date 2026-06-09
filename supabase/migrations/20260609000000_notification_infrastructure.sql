-- Notification preferences and dispatch indexes for in-app and email delivery.

begin;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  offers_enabled boolean not null default true,
  payments_enabled boolean not null default true,
  disputes_enabled boolean not null default true,
  saved_searches_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  digest_frequency text not null default 'instant' check (digest_frequency in ('instant','daily','weekly','never')),
  quiet_hours_start time,
  quiet_hours_end time,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_email_dispatch_idx
  on public.notifications(channel, status, created_at)
  where channel = 'email' and status = 'queued';

create index if not exists notifications_unread_in_app_idx
  on public.notifications(user_id, created_at desc)
  where channel = 'in_app' and read_at is null;

create index if not exists notification_preferences_digest_idx
  on public.notification_preferences(digest_frequency, updated_at desc);

alter table public.notification_preferences enable row level security;

do $$
begin
  create policy notification_preferences_owner_read
  on public.notification_preferences for select
  using (user_id = auth.uid() or public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy notification_preferences_owner_write
  on public.notification_preferences for all
  using (user_id = auth.uid() or public.current_user_is_admin())
  with check (user_id = auth.uid() or public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

commit;
