-- Offer negotiation state machine, status history, expiration, and dual-party notifications.

begin;

create table if not exists public.offer_status_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  actor_id uuid references public.users(id) on delete set null,
  from_status public.offer_status,
  to_status public.offer_status not null,
  reason text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists offer_status_history_offer_created_idx on public.offer_status_history(offer_id, created_at desc);
create index if not exists offer_status_history_conversation_created_idx on public.offer_status_history(conversation_id, created_at desc);

alter table public.offer_status_history enable row level security;

do $$
begin
  create policy offer_status_history_participant_read on public.offer_status_history
    for select using (public.is_offer_participant(offer_id) or public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

create or replace function public.offer_transition_actor()
returns uuid
language sql
volatile
as $$
  select coalesce(nullif(current_setting('app.offer_actor_id', true), '')::uuid, auth.uid())
$$;

create or replace function public.prevent_invalid_offer_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := public.offer_transition_actor();
  conversation_record public.conversations%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New offers must start as pending.' using errcode = '23514';
    end if;

    if new.created_by_id is null then
      new.created_by_id := actor;
    end if;

    if new.created_by_id is null or new.created_by_id not in (new.buyer_id, new.seller_id) then
      raise exception 'Offer creator must be the buyer or seller.' using errcode = '23514';
    end if;

    if new.conversation_id is not null then
      select * into conversation_record from public.conversations where id = new.conversation_id;
      if conversation_record.id is null then
        raise exception 'Conversation not found for offer.' using errcode = '23503';
      end if;
      if conversation_record.buyer_id <> new.buyer_id or conversation_record.seller_id <> new.seller_id or conversation_record.listing_id is distinct from new.listing_id then
        raise exception 'Offer participants must match the linked conversation.' using errcode = '23514';
      end if;
    end if;

    if new.expires_at is not null and new.expires_at <= now() then
      raise exception 'Offer expiration must be in the future.' using errcode = '23514';
    end if;

    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Cannot transition offer from terminal state %.', old.status using errcode = '23514';
  end if;

  if new.status not in ('accepted', 'declined', 'withdrawn', 'expired', 'countered') then
    raise exception 'Invalid offer transition from % to %.', old.status, new.status using errcode = '23514';
  end if;

  if old.expires_at is not null and old.expires_at <= now() and new.status <> 'expired' then
    raise exception 'Expired offers can only transition to expired.' using errcode = '23514';
  end if;

  if new.status in ('accepted', 'declined', 'countered') then
    if actor is null or actor not in (old.buyer_id, old.seller_id) or actor = old.created_by_id then
      raise exception 'Only the receiving participant can %, this offer.', new.status using errcode = '42501';
    end if;
    new.responded_by_id := actor;
  elsif new.status = 'withdrawn' then
    if actor is null or actor <> old.created_by_id then
      raise exception 'Only the offer creator can withdraw this offer.' using errcode = '42501';
    end if;
    new.responded_by_id := actor;
  elsif new.status = 'expired' then
    new.responded_by_id := coalesce(actor, old.responded_by_id);
  end if;

  if new.status = 'accepted' then
    new.accepted_at := coalesce(new.accepted_at, now());
  elsif new.status = 'declined' then
    new.rejected_at := coalesce(new.rejected_at, now());
  elsif new.status = 'withdrawn' then
    new.withdrawn_at := coalesce(new.withdrawn_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_invalid_offer_transition on public.offers;
create trigger prevent_invalid_offer_transition before insert or update on public.offers for each row execute function public.prevent_invalid_offer_transition();

create or replace function public.record_offer_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.offer_status_history (
      offer_id, conversation_id, listing_id, actor_id, from_status, to_status, reason, message, metadata
    ) values (
      new.id,
      new.conversation_id,
      new.listing_id,
      coalesce(new.responded_by_id, new.created_by_id, public.offer_transition_actor()),
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      coalesce(new.metadata->>'transition_reason', case when tg_op = 'INSERT' then 'created' else 'status_change' end),
      coalesce(new.response_message, new.message),
      jsonb_build_object('parent_offer_id', new.parent_offer_id, 'amount', new.amount, 'currency', new.currency)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_offer_status_history on public.offers;
create trigger record_offer_status_history after insert or update of status on public.offers for each row execute function public.record_offer_status_history();

create or replace function public.notify_offer_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  participant uuid;
  actor uuid;
  title text;
  body text;
begin
  actor := coalesce(new.responded_by_id, new.created_by_id);
  title := case new.status
    when 'accepted' then 'Offer accepted'
    when 'declined' then 'Offer rejected'
    when 'countered' then 'Offer countered'
    when 'expired' then 'Offer expired'
    when 'withdrawn' then 'Offer withdrawn'
    else 'Offer received'
  end;
  body := 'Amount: ' || new.currency || ' ' || new.amount::text;

  foreach participant in array array[new.buyer_id, new.seller_id]
  loop
    insert into public.notifications (user_id, type, title, body, channel, action_url, payload)
    values (
      participant,
      'offer_' || new.status::text,
      case when participant = actor then title || ' confirmation' else title end,
      body,
      'in_app',
      '/dashboard/messages?conversation=' || coalesce(new.conversation_id::text, ''),
      jsonb_build_object('offer_id', new.id, 'listing_id', new.listing_id, 'conversation_id', new.conversation_id, 'status', new.status, 'actor_id', actor)
    );
  end loop;

  return new;
end;
$$;

create or replace function public.expire_due_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  perform set_config('app.offer_actor_id', '', true);

  update public.offers
    set status = 'expired', metadata = metadata || jsonb_build_object('transition_reason', 'expiration_job')
    where status = 'pending' and expires_at is not null and expires_at <= now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.create_negotiation_offer(
  p_conversation_id uuid,
  p_amount numeric,
  p_message text default null,
  p_parent_offer_id uuid default null,
  p_reservation_deposit_amount numeric default 0,
  p_expires_at timestamptz default null
)
returns public.offers
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  conversation_record public.conversations%rowtype;
  parent_record public.offers%rowtype;
  listing_currency char(3);
  created_offer public.offers%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to make an offer.' using errcode = '42501';
  end if;

  select * into conversation_record from public.conversations where id = p_conversation_id;
  if conversation_record.id is null or actor not in (conversation_record.buyer_id, conversation_record.seller_id) then
    raise exception 'Conversation not found.' using errcode = '42501';
  end if;
  if conversation_record.status <> 'open' then
    raise exception 'Offers are only available in open conversations.' using errcode = '23514';
  end if;

  if p_amount <= 0 then
    raise exception 'Offer amount must be positive.' using errcode = '23514';
  end if;

  select currency into listing_currency from public.listings where id = conversation_record.listing_id;

  perform set_config('app.offer_actor_id', actor::text, true);

  if p_parent_offer_id is null then
    if actor <> conversation_record.buyer_id then
      raise exception 'Only buyers can make the first offer.' using errcode = '42501';
    end if;
  else
    select * into parent_record from public.offers where id = p_parent_offer_id for update;
    if parent_record.id is null or parent_record.conversation_id <> p_conversation_id then
      raise exception 'Parent offer not found.' using errcode = '23503';
    end if;
    if parent_record.status <> 'pending' then
      raise exception 'Only pending offers can be countered.' using errcode = '23514';
    end if;
    if parent_record.expires_at is not null and parent_record.expires_at <= now() then
      update public.offers set status = 'expired', metadata = metadata || jsonb_build_object('transition_reason', 'expired_before_counter') where id = parent_record.id;
      raise exception 'This offer has expired.' using errcode = '23514';
    end if;
    if actor = parent_record.created_by_id then
      raise exception 'Only the receiving participant can counter an offer.' using errcode = '42501';
    end if;

    update public.offers
      set status = 'countered', response_message = p_message, metadata = metadata || jsonb_build_object('transition_reason', 'countered')
      where id = parent_record.id;
  end if;

  insert into public.offers (
    conversation_id, listing_id, buyer_id, seller_id, created_by_id, amount, currency,
    message, status, parent_offer_id, reservation_deposit_amount, expires_at
  ) values (
    conversation_record.id, conversation_record.listing_id, conversation_record.buyer_id, conversation_record.seller_id,
    actor, p_amount, coalesce(listing_currency, 'USD'), p_message, 'pending', p_parent_offer_id,
    coalesce(p_reservation_deposit_amount, 0), p_expires_at
  ) returning * into created_offer;

  insert into public.messages (conversation_id, sender_id, body, kind, metadata)
  values (
    conversation_record.id,
    actor,
    case when p_parent_offer_id is null then 'Offer: ' else 'Counter offer: ' end || created_offer.currency || ' ' || created_offer.amount,
    'offer',
    jsonb_build_object('offer_id', created_offer.id, 'status', created_offer.status, 'parent_offer_id', p_parent_offer_id)
  );

  return created_offer;
end;
$$;

create or replace function public.respond_to_negotiation_offer(
  p_offer_id uuid,
  p_status public.offer_status,
  p_message text default null
)
returns public.offers
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  offer_record public.offers%rowtype;
  updated_offer public.offers%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to respond to an offer.' using errcode = '42501';
  end if;

  if p_status not in ('accepted', 'declined', 'withdrawn') then
    raise exception 'Unsupported offer response.' using errcode = '23514';
  end if;

  select * into offer_record from public.offers where id = p_offer_id for update;
  if offer_record.id is null or actor not in (offer_record.buyer_id, offer_record.seller_id) then
    raise exception 'Offer not found.' using errcode = '42501';
  end if;

  if offer_record.expires_at is not null and offer_record.expires_at <= now() and offer_record.status = 'pending' then
    perform set_config('app.offer_actor_id', actor::text, true);
    update public.offers set status = 'expired', metadata = metadata || jsonb_build_object('transition_reason', 'expired_before_response') where id = offer_record.id returning * into updated_offer;
    return updated_offer;
  end if;

  perform set_config('app.offer_actor_id', actor::text, true);

  update public.offers
    set status = p_status,
        response_message = p_message,
        metadata = metadata || jsonb_build_object('transition_reason', p_status::text)
    where id = p_offer_id
    returning * into updated_offer;

  insert into public.messages (conversation_id, sender_id, body, kind, metadata)
  values (
    updated_offer.conversation_id,
    actor,
    case p_status when 'accepted' then 'Offer accepted' when 'declined' then 'Offer rejected' else 'Offer withdrawn' end || coalesce(': ' || p_message, '.'),
    'offer',
    jsonb_build_object('offer_id', updated_offer.id, 'status', updated_offer.status)
  );

  return updated_offer;
end;
$$;

commit;
