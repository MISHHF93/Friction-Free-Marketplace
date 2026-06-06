-- Stripe Connect payment, escrow-style hold, payout, refund, dispute, and receipt schema.

begin;

-- -----------------------------------------------------------------------------
-- Additional payment domain enums
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.seller_payment_account_status as enum ('not_started', 'onboarding', 'pending', 'active', 'restricted', 'disabled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.transaction_event_type as enum (
    'created',
    'seller_onboarding_started',
    'seller_onboarding_completed',
    'payment_intent_created',
    'payment_requires_action',
    'payment_authorized',
    'payment_captured',
    'escrow_held',
    'seller_payout_scheduled',
    'seller_payout_paid',
    'refund_requested',
    'refund_succeeded',
    'dispute_opened',
    'dispute_updated',
    'dispute_closed',
    'cancelled',
    'failed'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Stripe Connect seller account state
-- -----------------------------------------------------------------------------

create table if not exists public.seller_payment_accounts (
  seller_id uuid primary key references public.users(id) on delete cascade,
  provider text not null default 'stripe',
  stripe_account_id text not null unique,
  status public.seller_payment_account_status not null default 'not_started',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  disabled_reason text,
  requirements_currently_due text[] not null default array[]::text[],
  requirements_eventually_due text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Payment audit trail, receipts, and webhook idempotency
-- -----------------------------------------------------------------------------

create table if not exists public.transaction_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  type public.transaction_event_type not null,
  from_status public.transaction_status,
  to_status public.transaction_status,
  provider text,
  provider_object_id text,
  amount numeric(12,2),
  currency char(3) check (currency is null or currency ~ '^[A-Z]{3}$'),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  api_version text,
  livemode boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete restrict,
  seller_id uuid not null references public.users(id) on delete restrict,
  receipt_number text not null unique default ('FFM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  provider text not null default 'stripe',
  provider_payment_id text,
  provider_charge_id text,
  subtotal_amount numeric(12,2) not null check (subtotal_amount >= 0),
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  platform_fee_amount numeric(12,2) not null default 0 check (platform_fee_amount >= 0),
  seller_net_amount numeric(12,2) not null check (seller_net_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  hosted_receipt_url text,
  issued_at timestamptz not null default now(),
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.escrow_payments add column if not exists provider_charge_id text;
alter table public.escrow_payments add column if not exists platform_fee_amount numeric(12,2) not null default 0 check (platform_fee_amount >= 0);
alter table public.escrow_payments add column if not exists seller_net_amount numeric(12,2) not null default 0 check (seller_net_amount >= 0);
alter table public.escrow_payments add column if not exists capture_before timestamptz;
alter table public.escrow_payments add column if not exists refunded_amount numeric(12,2) not null default 0 check (refunded_amount >= 0);
alter table public.payouts add column if not exists provider_transfer_id text unique;
alter table public.disputes add column if not exists respondent_id uuid references public.users(id) on delete set null;
alter table public.disputes add column if not exists provider_dispute_id text unique;
alter table public.disputes add column if not exists provider_payment_id text;
alter table public.disputes add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists seller_payment_accounts_status_idx on public.seller_payment_accounts(status, updated_at desc);
create index if not exists transaction_events_transaction_idx on public.transaction_events(transaction_id, created_at desc);
create index if not exists transaction_events_provider_idx on public.transaction_events(provider, provider_object_id);
create index if not exists transaction_receipts_buyer_idx on public.transaction_receipts(buyer_id, issued_at desc);
create index if not exists transaction_receipts_seller_idx on public.transaction_receipts(seller_id, issued_at desc);
create index if not exists escrow_payments_provider_charge_idx on public.escrow_payments(provider_charge_id);

create trigger seller_payment_accounts_set_updated_at before update on public.seller_payment_accounts for each row execute function public.set_updated_at();
create trigger transaction_receipts_set_updated_at before update on public.transaction_receipts for each row execute function public.set_updated_at();

alter table public.seller_payment_accounts enable row level security;
alter table public.transaction_events enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.transaction_receipts enable row level security;

create policy seller_payment_accounts_owner_read on public.seller_payment_accounts for select using (seller_id = auth.uid() or public.current_user_is_admin());
create policy seller_payment_accounts_owner_update_metadata on public.seller_payment_accounts for update using (seller_id = auth.uid() or public.current_user_is_admin()) with check (seller_id = auth.uid() or public.current_user_is_admin());
create policy seller_payment_accounts_admin_insert on public.seller_payment_accounts for insert with check (public.current_user_is_admin());

create policy transaction_events_participant_read on public.transaction_events for select using (public.is_transaction_participant(transaction_id) or actor_id = auth.uid() or public.current_user_is_admin());
create policy transaction_events_admin_write on public.transaction_events for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy stripe_webhook_events_admin_only on public.stripe_webhook_events for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy transaction_receipts_participant_read on public.transaction_receipts for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.current_user_is_admin());
create policy transaction_receipts_admin_write on public.transaction_receipts for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

commit;
