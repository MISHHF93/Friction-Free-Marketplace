-- Contact messages are stored even when email delivery is delayed.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100),
  email text not null check (length(email) between 3 and 254),
  topic text not null check (length(topic) between 2 and 80),
  message text not null check (length(message) between 10 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select using (public.current_user_is_admin());
