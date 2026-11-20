-- Offer payment has its own deadline, an accepted offer can be checked out
-- only once while that checkout is open, and escrow claims only move through
-- known transitions.

begin;

alter table public.offers add column if not exists payment_due_at timestamptz;

update public.offers
set payment_due_at = coalesce(accepted_at, updated_at, now()) + interval '48 hours'
where status = 'accepted'
  and payment_due_at is null;

alter table public.transactions drop constraint if exists transactions_offer_id_key;

create unique index if not exists transactions_open_offer_uidx
  on public.transactions (offer_id)
  where offer_id is not null
    and status in ('pending_payment', 'paid', 'escrowed', 'shipped', 'delivered', 'disputed');

create or replace function public.claim_escrow_payment(
  p_payment_id uuid,
  p_from public.payment_status,
  p_to public.payment_status
)
returns public.escrow_payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed public.escrow_payments;
begin
  if not (
    (p_from = 'requires_action' and p_to in ('authorized', 'cancelled', 'failed'))
    or (p_from = 'authorized' and p_to in ('capturing', 'refunding', 'cancelled'))
    or (p_from = 'capturing' and p_to in ('held', 'authorized'))
    or (p_from = 'held' and p_to in ('releasing', 'refunding'))
    or (p_from = 'releasing' and p_to in ('released', 'held'))
    or (p_from = 'refunding' and p_to in ('refunded', 'held', 'cancelled'))
  ) then
    return null;
  end if;

  update public.escrow_payments
    set status = p_to,
        updated_at = now()
    where id = p_payment_id
      and status = p_from
    returning * into claimed;
  return claimed;
end;
$$;

revoke all on function public.claim_escrow_payment(uuid, public.payment_status, public.payment_status) from public, anon, authenticated;
grant execute on function public.claim_escrow_payment(uuid, public.payment_status, public.payment_status) to service_role;

create or replace function public.respond_to_negotiation_offer(
  p_offer_id uuid,
  p_status public.offer_status,
  p_message text default null
)
returns public.offers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  offer_record public.offers%rowtype;
  updated_offer public.offers%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to respond to an offer.' using errcode = '42501';
  end if;

  if p_status not in ('accepted', 'declined', 'withdrawn', 'expired') then
    raise exception 'Unsupported offer response.' using errcode = '23514';
  end if;

  select * into offer_record from public.offers where id = p_offer_id for update;
  if offer_record.id is null or actor not in (offer_record.buyer_id, offer_record.seller_id) then
    raise exception 'Offer not found.' using errcode = '42501';
  end if;

  if p_status = 'withdrawn' and actor is distinct from offer_record.created_by_id then
    raise exception 'Only the person who made the offer can withdraw it.' using errcode = '42501';
  end if;

  if p_status in ('accepted', 'declined')
    and (offer_record.created_by_id is null or actor = offer_record.created_by_id) then
    raise exception 'Only the other participant can accept or decline this offer.' using errcode = '42501';
  end if;

  if p_status = 'expired' and (offer_record.expires_at is null or offer_record.expires_at > now()) then
    raise exception 'Only due offers can be expired.' using errcode = '23514';
  end if;

  if offer_record.expires_at is not null and offer_record.expires_at <= now() and offer_record.status = 'pending' then
    perform set_config('app.offer_actor_id', actor::text, true);
    update public.offers
      set status = 'expired',
          response_message = p_message,
          metadata = metadata || jsonb_build_object('transition_reason', 'expired_before_response')
      where id = offer_record.id
      returning * into updated_offer;
    return updated_offer;
  end if;

  perform set_config('app.offer_actor_id', actor::text, true);

  update public.offers
    set status = p_status,
        response_message = p_message,
        payment_due_at = case
          when p_status = 'accepted' then now() + interval '48 hours'
          else payment_due_at
        end,
        metadata = metadata || jsonb_build_object('transition_reason', p_status::text)
    where id = p_offer_id
    returning * into updated_offer;

  insert into public.messages (conversation_id, sender_id, body, kind, metadata)
  values (
    updated_offer.conversation_id,
    actor,
    case p_status
      when 'accepted' then 'Offer accepted'
      when 'declined' then 'Offer rejected'
      when 'expired' then 'Offer expired'
      else 'Offer withdrawn'
    end || coalesce(': ' || p_message, '.'),
    'offer',
    jsonb_build_object('offer_id', updated_offer.id, 'status', updated_offer.status, 'payment_due_at', updated_offer.payment_due_at)
  );

  return updated_offer;
end;
$$;

revoke all on function public.respond_to_negotiation_offer(uuid, public.offer_status, text) from public, anon;
grant execute on function public.respond_to_negotiation_offer(uuid, public.offer_status, text) to authenticated;

commit;
