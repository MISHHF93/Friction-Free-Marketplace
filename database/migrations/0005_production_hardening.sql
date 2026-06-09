alter table public.escrow_payments
  add column if not exists refunded_amount numeric(12,2) not null default 0;

create index if not exists escrow_payments_transaction_status_idx
  on public.escrow_payments(transaction_id, status);

create index if not exists escrow_payments_provider_payment_idx
  on public.escrow_payments(provider_payment_id);

create index if not exists payouts_transaction_idx
  on public.payouts(transaction_id, created_at desc);

create index if not exists disputes_transaction_status_idx
  on public.disputes(transaction_id, status, created_at desc);

create index if not exists disputes_provider_payment_idx
  on public.disputes(provider_payment_id)
  where provider_payment_id is not null;

do $$
begin
  if to_regclass('public.reports') is not null then
    create index if not exists reports_reported_user_reason_created_idx
      on public.reports(reported_user_id, reason, created_at desc)
      where reported_user_id is not null;
  end if;
end $$;

create index if not exists stripe_webhook_events_unprocessed_idx
  on public.stripe_webhook_events(type, created_at desc)
  where processed_at is null;
