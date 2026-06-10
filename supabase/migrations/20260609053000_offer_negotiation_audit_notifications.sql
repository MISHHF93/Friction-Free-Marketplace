-- Offer negotiation production hardening: attach notification trigger, support
-- explicit expiration, and mirror every offer transition into audit_logs.

begin;

create or replace function public.audit_offer_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    actor := coalesce(new.responded_by_id, new.created_by_id, public.offer_transition_actor());

    insert into public.audit_logs (
      actor_id,
      actor_type,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      metadata
    )
    values (
      actor,
      case when actor is null then 'system' else 'user' end,
      case new.status::text
        when 'pending' then 'offer.created'
        when 'accepted' then 'offer.accepted'
        when 'countered' then 'offer.countered'
        when 'declined' then 'offer.rejected'
        when 'expired' then 'offer.expired'
        when 'withdrawn' then 'offer.withdrawn'
        else 'offer.updated'
      end,
      'offers',
      new.id,
      case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      to_jsonb(new),
      jsonb_build_object(
        'source', 'offer_negotiation_state_machine',
        'conversation_id', new.conversation_id,
        'listing_id', new.listing_id,
        'from_status', case when tg_op = 'INSERT' then null else old.status::text end,
        'to_status', new.status::text,
        'parent_offer_id', new.parent_offer_id,
        'amount', new.amount,
        'currency', new.currency
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_offer_transition on public.offers;
create trigger audit_offer_transition
after insert or update of status on public.offers
for each row execute function public.audit_offer_transition();

drop trigger if exists notify_offer_change on public.offers;
create trigger notify_offer_change
after insert or update of status on public.offers
for each row execute function public.notify_offer_change();

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

  if p_status not in ('accepted', 'declined', 'withdrawn', 'expired') then
    raise exception 'Unsupported offer response.' using errcode = '23514';
  end if;

  select * into offer_record from public.offers where id = p_offer_id for update;
  if offer_record.id is null or actor not in (offer_record.buyer_id, offer_record.seller_id) then
    raise exception 'Offer not found.' using errcode = '42501';
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

grant execute on function public.create_negotiation_offer(uuid, numeric, text, uuid, numeric, timestamptz) to authenticated;
grant execute on function public.respond_to_negotiation_offer(uuid, public.offer_status, text) to authenticated;
revoke execute on function public.expire_due_offers() from public, anon, authenticated;
grant execute on function public.expire_due_offers() to service_role;

commit;
