-- Real-time communication, negotiation, scheduling, deposits, and safety workflows.

begin;


-- -----------------------------------------------------------------------------
-- Attachment storage bucket
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.conversation_status as enum ('open', 'archived', 'blocked', 'closed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_kind as enum ('text', 'attachment', 'offer', 'system', 'pickup_schedule', 'deposit');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.attachment_status as enum ('pending', 'ready', 'rejected', 'deleted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.pickup_schedule_status as enum ('proposed', 'confirmed', 'reschedule_requested', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reservation_deposit_status as enum ('pending', 'authorized', 'held', 'released', 'forfeited', 'refunded', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ghosting_penalty_status as enum ('pending', 'applied', 'waived', 'appealed', 'reversed');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Conversation and message extensions
-- -----------------------------------------------------------------------------

alter table public.conversations
  alter column status drop default;

alter table public.conversations
  alter column status type public.conversation_status using status::public.conversation_status;

alter table public.conversations
  alter column status set default 'open'::public.conversation_status;

alter table public.conversations
  add column if not exists muted_by uuid[] not null default '{}'::uuid[],
  add column if not exists closed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.messages
  add column if not exists kind public.message_kind not null default 'text',
  add column if not exists client_token text,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists reported_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists messages_conversation_client_token_idx
  on public.messages(conversation_id, client_token)
  where client_token is not null;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  uploader_id uuid not null references public.users(id) on delete cascade,
  storage_bucket text not null default 'message-attachments',
  storage_path text not null,
  public_url text,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  status public.attachment_status not null default 'pending',
  moderation_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

do $$
begin
  create policy message_attachments_storage_participant_read
  on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.message_attachments ma
      where ma.storage_bucket = bucket_id
        and ma.storage_path = name
        and public.is_conversation_participant(ma.conversation_id)
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy message_attachments_storage_owner_insert
  on storage.objects for insert
  with check (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy message_attachments_storage_owner_update
  on storage.objects for update
  using (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy message_attachments_storage_owner_delete
  on storage.objects for delete
  using (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;


create table if not exists public.message_read_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.conversation_typing_indicators (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_typing boolean not null default true,
  typed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 seconds',
  primary key (conversation_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Offers, pickup scheduling, deposits, anti-ghosting, blocking, and reporting
-- -----------------------------------------------------------------------------

alter table public.offers
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists created_by_id uuid references public.users(id) on delete set null,
  add column if not exists responded_by_id uuid references public.users(id) on delete set null,
  add column if not exists response_message text,
  add column if not exists rejected_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists reservation_deposit_amount numeric(12,2) not null default 0 check (reservation_deposit_amount >= 0),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.pickup_schedules (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  proposed_by_id uuid not null references public.users(id) on delete cascade,
  status public.pickup_schedule_status not null default 'proposed',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  location_label text not null,
  location_details text,
  safety_notes text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  no_show_reported_by_id uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_schedules_distinct_participants check (buyer_id <> seller_id),
  constraint pickup_schedules_actor_participant check (proposed_by_id in (buyer_id, seller_id)),
  constraint pickup_schedules_end_after_start check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.reservation_deposits (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  pickup_schedule_id uuid references public.pickup_schedules(id) on delete set null,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  status public.reservation_deposit_status not null default 'pending',
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  provider text,
  provider_payment_id text,
  due_at timestamptz,
  authorized_at timestamptz,
  held_at timestamptz,
  released_at timestamptz,
  forfeited_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_deposits_distinct_participants check (buyer_id <> seller_id)
);

create table if not exists public.anti_ghosting_penalties (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  pickup_schedule_id uuid references public.pickup_schedules(id) on delete set null,
  deposit_id uuid references public.reservation_deposits(id) on delete set null,
  penalized_user_id uuid not null references public.users(id) on delete cascade,
  reported_by_id uuid references public.users(id) on delete set null,
  status public.ghosting_penalty_status not null default 'pending',
  reason text not null,
  penalty_points integer not null default 0 check (penalty_points >= 0),
  penalty_amount numeric(12,2) not null default 0 check (penalty_amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  evidence jsonb not null default '{}'::jsonb,
  applied_at timestamptz,
  waived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

alter table public.reports
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists offer_id uuid references public.offers(id) on delete set null,
  add column if not exists pickup_schedule_id uuid references public.pickup_schedules(id) on delete set null;

-- -----------------------------------------------------------------------------
-- Helpers and triggers
-- -----------------------------------------------------------------------------

create or replace function public.is_conversation_blocked(conversation_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conversation_uuid
      and (
        c.status = 'blocked'
        or exists (
          select 1
          from public.user_blocks b
          where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
             or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)
        )
      )
  );
$$;

create or replace function public.is_offer_participant(offer_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.offers o
    where o.id = offer_uuid and auth.uid() in (o.buyer_id, o.seller_id)
  );
$$;

create or replace function public.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.sync_message_read_at_from_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = least(coalesce(read_at, new.read_at), new.read_at)
  where id = new.message_id
    and sender_id <> new.user_id
    and read_at is null;
  return new;
end;
$$;

create or replace function public.notify_conversation_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  convo public.conversations%rowtype;
begin
  select * into convo from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  recipient := case when new.sender_id = convo.buyer_id then convo.seller_id else convo.buyer_id end;
  insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
  values (
    recipient,
    'message_received',
    'New marketplace message',
    left(coalesce(new.body, 'Attachment'), 180),
    'in_app',
    '/dashboard/messages?conversation=' || new.conversation_id::text,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'sender_id', new.sender_id, 'kind', new.kind)
  );
  return new;
end;
$$;

create or replace function public.notify_offer_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  label text;
begin
  recipient := case
    when new.status in ('accepted', 'declined', 'withdrawn') then coalesce(new.created_by_id, new.buyer_id)
    when coalesce(new.created_by_id, new.buyer_id) = new.buyer_id then new.seller_id
    else new.buyer_id
  end;
  label := case new.status
    when 'accepted' then 'Offer accepted'
    when 'declined' then 'Offer rejected'
    when 'countered' then 'Counter offer received'
    else 'Offer received'
  end;

  insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
  values (
    recipient,
    'offer_' || new.status::text,
    label,
    'Amount: ' || new.currency || ' ' || new.amount::text,
    'in_app',
    '/dashboard/messages?conversation=' || coalesce(new.conversation_id::text, ''),
    jsonb_build_object('offer_id', new.id, 'listing_id', new.listing_id, 'conversation_id', new.conversation_id, 'status', new.status)
  );
  return new;
end;
$$;

create or replace function public.notify_pickup_or_deposit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  event_type text := tg_table_name;
begin
  recipient := case when auth.uid() = new.buyer_id then new.seller_id else new.buyer_id end;
  insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
  values (
    recipient,
    event_type || '_updated',
    case when event_type = 'pickup_schedules' then 'Pickup schedule updated' else 'Reservation deposit updated' end,
    'Open the conversation for details.',
    'in_app',
    '/dashboard/messages?conversation=' || new.conversation_id::text,
    jsonb_build_object('conversation_id', new.conversation_id, 'record_id', new.id, 'status', new.status)
  );
  return new;
end;
$$;


create or replace function public.enqueue_anti_ghosting_penalty_from_pickup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  if (tg_op = 'INSERT' and new.status = 'no_show') or (tg_op = 'UPDATE' and new.status = 'no_show' and old.status is distinct from new.status) then
    target_user := case when new.no_show_reported_by_id = new.buyer_id then new.seller_id else new.buyer_id end;
    insert into public.anti_ghosting_penalties (
      conversation_id,
      pickup_schedule_id,
      penalized_user_id,
      reported_by_id,
      reason,
      penalty_points,
      evidence
    ) values (
      new.conversation_id,
      new.id,
      target_user,
      new.no_show_reported_by_id,
      'pickup_no_show',
      10,
      jsonb_build_object('pickup_schedule_id', new.id, 'starts_at', new.starts_at, 'location_label', new.location_label)
    );
  end if;
  return new;
end;
$$;

create or replace function public.enqueue_anti_ghosting_penalty_from_deposit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.status = 'forfeited') or (tg_op = 'UPDATE' and new.status = 'forfeited' and old.status is distinct from new.status) then
    insert into public.anti_ghosting_penalties (
      conversation_id,
      deposit_id,
      penalized_user_id,
      reason,
      penalty_points,
      penalty_amount,
      currency,
      evidence
    ) values (
      new.conversation_id,
      new.id,
      new.buyer_id,
      'reservation_deposit_forfeited',
      5,
      new.amount,
      new.currency,
      jsonb_build_object('deposit_id', new.id, 'offer_id', new.offer_id)
    );
  end if;
  return new;
end;
$$;


create or replace function public.notify_message_report_to_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.message_id is not null then
    insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
    select
      u.id,
      'message_reported',
      'Message reported',
      left(new.description, 180),
      'in_app',
      '/admin/reports',
      jsonb_build_object('report_id', new.id, 'conversation_id', new.conversation_id, 'message_id', new.message_id)
    from public.users u
    where u.role in ('admin', 'super_admin') and u.status = 'active';
  end if;
  return new;
end;
$$;

create or replace function public.apply_block_to_conversations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set status = 'blocked', updated_at = now()
  where (buyer_id = new.blocker_id and seller_id = new.blocked_id)
     or (buyer_id = new.blocked_id and seller_id = new.blocker_id);
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'conversations','messages','message_attachments','conversation_typing_indicators',
    'pickup_schedules','reservation_deposits','anti_ghosting_penalties'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    if table_name <> 'conversation_typing_indicators' then
      execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    end if;
  end loop;
end $$;

drop trigger if exists touch_conversation_from_message on public.messages;
create trigger touch_conversation_from_message after insert on public.messages for each row execute function public.touch_conversation_from_message();

drop trigger if exists sync_message_read_at_from_receipt on public.message_read_receipts;
create trigger sync_message_read_at_from_receipt after insert on public.message_read_receipts for each row execute function public.sync_message_read_at_from_receipt();

drop trigger if exists notify_conversation_message on public.messages;
create trigger notify_conversation_message after insert on public.messages for each row execute function public.notify_conversation_message();

drop trigger if exists notify_offer_change on public.offers;
create trigger notify_offer_change after insert or update of status on public.offers for each row execute function public.notify_offer_change();

drop trigger if exists notify_pickup_schedule_change on public.pickup_schedules;
create trigger notify_pickup_schedule_change after insert or update of status on public.pickup_schedules for each row execute function public.notify_pickup_or_deposit_change();

drop trigger if exists notify_reservation_deposit_change on public.reservation_deposits;
create trigger notify_reservation_deposit_change after insert or update of status on public.reservation_deposits for each row execute function public.notify_pickup_or_deposit_change();


drop trigger if exists enqueue_anti_ghosting_penalty_from_pickup on public.pickup_schedules;
create trigger enqueue_anti_ghosting_penalty_from_pickup after insert or update of status on public.pickup_schedules for each row execute function public.enqueue_anti_ghosting_penalty_from_pickup();

drop trigger if exists enqueue_anti_ghosting_penalty_from_deposit on public.reservation_deposits;
create trigger enqueue_anti_ghosting_penalty_from_deposit after insert or update of status on public.reservation_deposits for each row execute function public.enqueue_anti_ghosting_penalty_from_deposit();


drop trigger if exists notify_message_report_to_admins on public.reports;
create trigger notify_message_report_to_admins after insert on public.reports for each row execute function public.notify_message_report_to_admins();

drop trigger if exists apply_block_to_conversations on public.user_blocks;
create trigger apply_block_to_conversations after insert on public.user_blocks for each row execute function public.apply_block_to_conversations();

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists message_attachments_message_idx on public.message_attachments(message_id, created_at);
create index if not exists message_attachments_conversation_idx on public.message_attachments(conversation_id, created_at desc);
create index if not exists message_read_receipts_conversation_user_idx on public.message_read_receipts(conversation_id, user_id, read_at desc);
create index if not exists typing_indicators_active_idx on public.conversation_typing_indicators(conversation_id, expires_at desc) where is_typing;
create index if not exists offers_conversation_idx on public.offers(conversation_id, created_at desc);
create index if not exists pickup_schedules_conversation_status_idx on public.pickup_schedules(conversation_id, status, starts_at);
create index if not exists reservation_deposits_conversation_status_idx on public.reservation_deposits(conversation_id, status, created_at desc);
create index if not exists anti_ghosting_penalties_user_status_idx on public.anti_ghosting_penalties(penalized_user_id, status, created_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id, created_at desc);
create index if not exists reports_message_idx on public.reports(message_id) where message_id is not null;

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'message_attachments','message_read_receipts','conversation_typing_indicators',
    'pickup_schedules','reservation_deposits','anti_ghosting_penalties','user_blocks'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages
  for insert
  with check (
    (sender_id = auth.uid() and public.is_conversation_participant(conversation_id) and not public.is_conversation_blocked(conversation_id))
    or public.current_user_is_admin()
  );

create policy message_attachments_participant_read on public.message_attachments for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());
create policy message_attachments_uploader_insert on public.message_attachments for insert
  with check (uploader_id = auth.uid() and public.is_conversation_participant(conversation_id) and not public.is_conversation_blocked(conversation_id));
create policy message_attachments_uploader_update on public.message_attachments for update
  using (uploader_id = auth.uid() or public.current_user_is_admin())
  with check (uploader_id = auth.uid() or public.current_user_is_admin());

create policy message_read_receipts_participant_read on public.message_read_receipts for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());
create policy message_read_receipts_self_insert on public.message_read_receipts for insert
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

create policy typing_indicators_participant_read on public.conversation_typing_indicators for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());
create policy typing_indicators_self_upsert on public.conversation_typing_indicators for all
  using (user_id = auth.uid() and public.is_conversation_participant(conversation_id))
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

create policy pickup_schedules_participant_read on public.pickup_schedules for select
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin());
create policy pickup_schedules_participant_insert on public.pickup_schedules for insert
  with check (proposed_by_id = auth.uid() and auth.uid() in (buyer_id, seller_id) and public.is_conversation_participant(conversation_id));
create policy pickup_schedules_participant_update on public.pickup_schedules for update
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin())
  with check (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin());

create policy reservation_deposits_participant_read on public.reservation_deposits for select
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin());
create policy reservation_deposits_participant_insert on public.reservation_deposits for insert
  with check (auth.uid() in (buyer_id, seller_id) and public.is_conversation_participant(conversation_id));
create policy reservation_deposits_participant_update on public.reservation_deposits for update
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin())
  with check (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin());

create policy anti_ghosting_penalties_participant_read on public.anti_ghosting_penalties for select
  using (penalized_user_id = auth.uid() or reported_by_id = auth.uid() or public.current_user_is_admin());
create policy anti_ghosting_penalties_participant_insert on public.anti_ghosting_penalties for insert
  with check (reported_by_id = auth.uid() or public.current_user_is_admin());
create policy anti_ghosting_penalties_admin_update on public.anti_ghosting_penalties for update
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy user_blocks_self_read on public.user_blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.current_user_is_admin());
create policy user_blocks_self_insert on public.user_blocks for insert
  with check (blocker_id = auth.uid() or public.current_user_is_admin());
create policy user_blocks_self_delete on public.user_blocks for delete
  using (blocker_id = auth.uid() or public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- Supabase Realtime publication
-- -----------------------------------------------------------------------------

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.message_attachments replica identity full;
alter table public.message_read_receipts replica identity full;
alter table public.conversation_typing_indicators replica identity full;
alter table public.offers replica identity full;
alter table public.pickup_schedules replica identity full;
alter table public.reservation_deposits replica identity full;
alter table public.anti_ghosting_penalties replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.message_attachments;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.message_read_receipts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.conversation_typing_indicators;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.offers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.pickup_schedules;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.reservation_deposits;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

commit;
