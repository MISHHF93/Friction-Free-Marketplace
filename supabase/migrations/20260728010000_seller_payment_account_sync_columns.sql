-- Additive seller Connect columns used by onboarding, status sync, and checkout.
-- These fields exist in application types and lib/payments/connect.ts but were
-- never added to the canonical migration history.

alter table public.seller_payment_accounts
  add column if not exists requirements_past_due text[] not null default '{}',
  add column if not exists requirements_pending_verification text[] not null default '{}',
  add column if not exists last_synced_at timestamptz;

comment on column public.seller_payment_accounts.requirements_past_due is
  'Stripe Connect requirements.past_due. Empty until the account is synced.';
comment on column public.seller_payment_accounts.requirements_pending_verification is
  'Stripe Connect requirements.pending_verification. Empty until the account is synced.';
comment on column public.seller_payment_accounts.last_synced_at is
  'Last time this row was updated from a Stripe account object.';
