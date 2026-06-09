do $$
begin
  create type public.notification_status as enum ('queued', 'sent', 'read', 'failed', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'push')),
  status public.notification_status not null default 'queued',
  action_url text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists notifications_user_status_idx on public.notifications(user_id, status, created_at desc);
create index if not exists notifications_email_dispatch_idx on public.notifications(channel, status, created_at) where channel = 'email' and status = 'queued';
create index if not exists notifications_unread_in_app_idx on public.notifications(user_id, created_at desc) where channel = 'in_app' and read_at is null;
create index if not exists notification_preferences_digest_idx on public.notification_preferences(digest_frequency, updated_at desc);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy "Users manage their notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage notification preferences" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
