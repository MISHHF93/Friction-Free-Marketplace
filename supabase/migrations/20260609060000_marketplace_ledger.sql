-- Marketplace double-entry ledger for revenue, fees, payables, payouts, refunds, and disputes.

begin;

do $$
begin
  create type public.financial_account_type as enum ('asset', 'liability', 'revenue', 'expense', 'contra_revenue', 'equity');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ledger_entry_direction as enum ('debit', 'credit');
exception when duplicate_object then null;
end $$;

create table if not exists public.financial_accounts (
  code text primary key,
  name text not null,
  account_type public.financial_account_type not null,
  normal_balance public.ledger_entry_direction not null,
  category text not null,
  description text,
  is_system boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_accounts_code_format check (code ~ '^[a-z][a-z0-9_]*$')
);

create table if not exists public.financial_ledger_journals (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  source_type text not null,
  source_id text not null,
  event_type text not null,
  description text,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null unique,
  posted_at timestamptz not null default now(),
  posted_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.financial_ledger_journals(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  account_code text not null references public.financial_accounts(code),
  user_id uuid references public.users(id) on delete set null,
  debit_amount numeric(12,2) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(12,2) not null default 0 check (credit_amount >= 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  provider text,
  provider_object_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint financial_ledger_entries_one_side check (
    (debit_amount > 0 and credit_amount = 0) or (credit_amount > 0 and debit_amount = 0)
  )
);

create index if not exists financial_ledger_journals_transaction_idx on public.financial_ledger_journals(transaction_id, posted_at desc);
create index if not exists financial_ledger_journals_source_idx on public.financial_ledger_journals(source_type, source_id);
create index if not exists financial_ledger_journals_event_idx on public.financial_ledger_journals(event_type, posted_at desc);
create index if not exists financial_ledger_entries_journal_idx on public.financial_ledger_entries(journal_id);
create index if not exists financial_ledger_entries_transaction_idx on public.financial_ledger_entries(transaction_id, created_at desc);
create index if not exists financial_ledger_entries_account_idx on public.financial_ledger_entries(account_code, currency, created_at desc);
create index if not exists financial_ledger_entries_provider_idx on public.financial_ledger_entries(provider, provider_object_id);
create index if not exists financial_ledger_entries_user_idx on public.financial_ledger_entries(user_id, created_at desc);

create trigger financial_accounts_set_updated_at before update on public.financial_accounts for each row execute function public.set_updated_at();

alter table public.financial_accounts enable row level security;
alter table public.financial_ledger_journals enable row level security;
alter table public.financial_ledger_entries enable row level security;

do $$
begin
  create policy financial_accounts_admin_read on public.financial_accounts
    for select using (public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy financial_ledger_journals_admin_read on public.financial_ledger_journals
    for select using (public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy financial_ledger_journals_participant_read on public.financial_ledger_journals
    for select using (
      transaction_id is not null and public.is_transaction_participant(transaction_id)
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy financial_ledger_entries_admin_read on public.financial_ledger_entries
    for select using (public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy financial_ledger_entries_participant_read on public.financial_ledger_entries
    for select using (
      transaction_id is not null and public.is_transaction_participant(transaction_id)
    );
exception when duplicate_object then null;
end $$;

insert into public.financial_accounts (code, name, account_type, normal_balance, category, description)
values
  ('stripe_cash', 'Stripe cash balance', 'asset', 'debit', 'cash', 'Captured platform Stripe balance before refunds, transfers, and fees.'),
  ('seller_payable', 'Seller payable', 'liability', 'credit', 'payables', 'Captured funds owed to sellers before release.'),
  ('platform_fee_deferred', 'Deferred platform fees', 'liability', 'credit', 'fees', 'Buyer-paid platform fees before revenue recognition.'),
  ('platform_fee_revenue', 'Platform fee revenue', 'revenue', 'credit', 'revenue', 'Recognized marketplace fee revenue.'),
  ('refunds_payable', 'Refunds payable', 'liability', 'credit', 'refunds', 'Approved refunds pending settlement.'),
  ('dispute_hold', 'Dispute hold', 'liability', 'credit', 'disputes', 'Funds blocked by an internal or Stripe dispute.'),
  ('chargeback_loss', 'Chargeback loss', 'expense', 'debit', 'disputes', 'Unrecovered dispute losses and chargeback fees.'),
  ('stripe_processing_fees', 'Stripe processing fees', 'expense', 'debit', 'fees', 'Processor fees charged by Stripe.'),
  ('seller_transfer_reversal_receivable', 'Seller transfer reversal receivable', 'asset', 'debit', 'refunds', 'Seller funds recoverable after post-release refund or dispute.'),
  ('tax_liability', 'Tax liability', 'liability', 'credit', 'tax', 'Tax collected and payable to the responsible party.'),
  ('shipping_liability', 'Shipping liability', 'liability', 'credit', 'shipping', 'Shipping collected and payable to the responsible party.')
on conflict (code) do update set
  name = excluded.name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  category = excluded.category,
  description = excluded.description,
  is_active = true;

create or replace function public.assert_financial_journal_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_journal uuid;
  totals record;
begin
  target_journal := coalesce(new.journal_id, old.journal_id);

  select
    count(*) as entry_count,
    coalesce(sum(debit_amount), 0) as debits,
    coalesce(sum(credit_amount), 0) as credits,
    count(distinct currency) as currency_count
  into totals
  from public.financial_ledger_entries
  where journal_id = target_journal;

  if totals.entry_count < 2 then
    raise exception 'Financial journal % must have at least two entries.', target_journal using errcode = '23514';
  end if;

  if totals.currency_count <> 1 then
    raise exception 'Financial journal % must use exactly one currency.', target_journal using errcode = '23514';
  end if;

  if totals.debits <> totals.credits then
    raise exception 'Financial journal % is not balanced: debits %, credits %.', target_journal, totals.debits, totals.credits using errcode = '23514';
  end if;

  return null;
end;
$$;

drop trigger if exists financial_ledger_entries_balanced on public.financial_ledger_entries;
create constraint trigger financial_ledger_entries_balanced
after insert or update or delete on public.financial_ledger_entries
deferrable initially deferred
for each row execute function public.assert_financial_journal_balanced();

create or replace function public.post_financial_journal(
  p_transaction_id uuid,
  p_source_type text,
  p_source_id text,
  p_event_type text,
  p_currency char(3),
  p_description text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  journal_id uuid;
  entry jsonb;
  debit_total numeric(12,2) := 0;
  credit_total numeric(12,2) := 0;
  entry_count integer := 0;
  account_exists boolean;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Ledger idempotency key is required.' using errcode = '23514';
  end if;

  select id into existing_id from public.financial_ledger_journals where idempotency_key = p_idempotency_key;
  if existing_id is not null then
    return existing_id;
  end if;

  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Ledger entries must be a JSON array.' using errcode = '23514';
  end if;

  for entry in select * from jsonb_array_elements(p_entries)
  loop
    entry_count := entry_count + 1;
    debit_total := debit_total + coalesce((entry->>'debit_amount')::numeric, 0);
    credit_total := credit_total + coalesce((entry->>'credit_amount')::numeric, 0);

    select exists(select 1 from public.financial_accounts where code = entry->>'account_code' and is_active) into account_exists;
    if not account_exists then
      raise exception 'Unknown or inactive financial account: %.', entry->>'account_code' using errcode = '23503';
    end if;
  end loop;

  if entry_count < 2 then
    raise exception 'Ledger journal must have at least two entries.' using errcode = '23514';
  end if;

  if debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Ledger journal is not balanced: debits %, credits %.', debit_total, credit_total using errcode = '23514';
  end if;

  insert into public.financial_ledger_journals (
    transaction_id, source_type, source_id, event_type, currency, description, idempotency_key, posted_by, metadata
  ) values (
    p_transaction_id, p_source_type, p_source_id, p_event_type, upper(p_currency), p_description, p_idempotency_key, auth.uid(), coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into journal_id;

  for entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.financial_ledger_entries (
      journal_id,
      transaction_id,
      account_code,
      user_id,
      debit_amount,
      credit_amount,
      currency,
      provider,
      provider_object_id,
      metadata
    ) values (
      journal_id,
      p_transaction_id,
      entry->>'account_code',
      nullif(entry->>'user_id', '')::uuid,
      round(coalesce((entry->>'debit_amount')::numeric, 0), 2),
      round(coalesce((entry->>'credit_amount')::numeric, 0), 2),
      upper(p_currency),
      nullif(entry->>'provider', ''),
      nullif(entry->>'provider_object_id', ''),
      coalesce(entry->'metadata', '{}'::jsonb)
    );
  end loop;

  return journal_id;
end;
$$;

revoke execute on function public.post_financial_journal(uuid, text, text, text, char, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.post_financial_journal(uuid, text, text, text, char, text, text, jsonb, jsonb) to service_role;

create or replace view public.financial_account_balances
with (security_invoker = true) as
select
  e.account_code,
  a.name,
  a.account_type,
  a.normal_balance,
  a.category,
  e.currency,
  sum(e.debit_amount) as debit_total,
  sum(e.credit_amount) as credit_total,
  case
    when a.normal_balance = 'debit' then sum(e.debit_amount) - sum(e.credit_amount)
    else sum(e.credit_amount) - sum(e.debit_amount)
  end as balance,
  max(e.created_at) as last_entry_at
from public.financial_ledger_entries e
join public.financial_accounts a on a.code = e.account_code
group by e.account_code, a.name, a.account_type, a.normal_balance, a.category, e.currency;

create or replace view public.financial_revenue_summary
with (security_invoker = true) as
select
  currency,
  sum(case when account_code = 'platform_fee_revenue' then credit_amount - debit_amount else 0 end) as platform_fee_revenue,
  sum(case when account_code = 'platform_fee_deferred' then credit_amount - debit_amount else 0 end) as deferred_platform_fees,
  sum(case when account_code = 'seller_payable' then credit_amount - debit_amount else 0 end) as seller_payables,
  sum(case when account_code = 'stripe_cash' then debit_amount - credit_amount else 0 end) as stripe_cash_balance,
  sum(case when account_code = 'chargeback_loss' then debit_amount - credit_amount else 0 end) as chargeback_losses,
  sum(case when account_code = 'stripe_processing_fees' then debit_amount - credit_amount else 0 end) as stripe_processing_fees
from public.financial_ledger_entries
group by currency;

commit;
