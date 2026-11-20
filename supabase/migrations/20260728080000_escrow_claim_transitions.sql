-- Intermediate payment states make capture, release, and refund a single-winner
-- update. A second request sees no row and stops before Stripe is called again.

alter type public.payment_status add value if not exists 'capturing';
alter type public.payment_status add value if not exists 'releasing';
alter type public.payment_status add value if not exists 'refunding';

create or replace function public.claim_escrow_payment(
  p_payment_id uuid,
  p_from public.payment_status,
  p_to public.payment_status
)
returns public.escrow_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.escrow_payments;
begin
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
