-- The negotiation RPC is security definer, so it must enforce who may move
-- an offer. Withdrawal belongs to the person who made it. Acceptance and
-- decline belong to the other participant.

begin;

create or replace function public.respond_to_negotiation_offer(
  p_offer_id uuid,
  p_status public.offer_status,
  p_message text default null
)
returns public.offers
language plpgsql
security definer
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
    jsonb_build_object('offer_id', updated_offer.id, 'status', updated_offer.status)
  );

  return updated_offer;
end;
$$;

revoke all on function public.respond_to_negotiation_offer(uuid, public.offer_status, text) from public, anon;
grant execute on function public.respond_to_negotiation_offer(uuid, public.offer_status, text) to authenticated;

commit;
