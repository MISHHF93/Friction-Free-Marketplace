create table if not exists public.seller_payment_accounts (
  seller_id uuid primary key references public.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  stripe_account_id text not null unique check (stripe_account_id like 'acct_%'),
  status text not null default 'onboarding' check (status in ('not_started','onboarding','pending','active','restricted')),
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  disabled_reason text,
  requirements_currently_due text[] not null default '{}',
  requirements_eventually_due text[] not null default '{}',
  requirements_past_due text[] not null default '{}',
  requirements_pending_verification text[] not null default '{}',
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  offer_id uuid,
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','escrowed','completed','cancelled','refunded','disputed')),
  item_amount numeric(12,2) not null default 0,
  shipping_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  marketplace_fee_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (item_amount + shipping_amount + tax_amount + marketplace_fee_amount) stored,
  currency char(3) not null default 'USD',
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.escrow_payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_payment_id text not null unique,
  provider_charge_id text,
  status text not null default 'requires_action' check (status in ('requires_action','authorized','held','released','refunded','failed','cancelled')),
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  platform_fee_amount numeric(12,2) not null default 0,
  seller_net_amount numeric(12,2) not null default 0,
  capture_before timestamptz,
  authorized_at timestamptz,
  captured_at timestamptz,
  held_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  seller_id uuid not null references public.users(id),
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_transfer_id text unique,
  provider_payout_id text,
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_receipts (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  provider text not null default 'stripe',
  provider_payment_id text,
  provider_charge_id text,
  subtotal_amount numeric(12,2) not null default 0,
  shipping_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  platform_fee_amount numeric(12,2) not null default 0,
  seller_net_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency char(3) not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  actor_id uuid references public.users(id),
  type text not null,
  from_status text,
  to_status text,
  provider text,
  provider_object_id text,
  amount numeric(12,2),
  currency char(3),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  api_version text,
  livemode boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  opened_by_id uuid not null references public.users(id),
  respondent_id uuid not null references public.users(id),
  provider_dispute_id text unique,
  provider_payment_id text,
  status text not null default 'under_review' check (status in ('open','under_review','closed')),
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_payment_accounts_status_idx on public.seller_payment_accounts(status);
create index if not exists transactions_buyer_id_idx on public.transactions(buyer_id);
create index if not exists transactions_seller_id_idx on public.transactions(seller_id);
create index if not exists escrow_payments_transaction_id_idx on public.escrow_payments(transaction_id);
create index if not exists transaction_events_transaction_id_idx on public.transaction_events(transaction_id);
create index if not exists stripe_webhook_events_type_idx on public.stripe_webhook_events(type);

alter table public.seller_payment_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.escrow_payments enable row level security;
alter table public.payouts enable row level security;
alter table public.transaction_receipts enable row level security;
alter table public.transaction_events enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.disputes enable row level security;

create policy "Sellers read their Connect status" on public.seller_payment_accounts for select using (auth.uid() = seller_id);
create policy "Participants read their transactions" on public.transactions for select using (auth.uid() in (buyer_id, seller_id));
create policy "Participants read escrow payments" on public.escrow_payments for select using (exists (select 1 from public.transactions t where t.id = transaction_id and auth.uid() in (t.buyer_id, t.seller_id)));
create policy "Sellers read payouts" on public.payouts for select using (auth.uid() = seller_id);
create policy "Participants read receipts" on public.transaction_receipts for select using (auth.uid() in (buyer_id, seller_id));
create policy "Participants read transaction events" on public.transaction_events for select using (transaction_id is null or exists (select 1 from public.transactions t where t.id = transaction_id and auth.uid() in (t.buyer_id, t.seller_id)));
create policy "Participants read disputes" on public.disputes for select using (auth.uid() in (opened_by_id, respondent_id));
