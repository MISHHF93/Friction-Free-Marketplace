begin;

alter table public.transactions
  add column if not exists idempotency_key text;

create unique index if not exists transactions_buyer_idempotency_key_unique
  on public.transactions (buyer_id, idempotency_key)
  where idempotency_key is not null;

alter table public.transactions
  drop constraint if exists transactions_idempotency_key_length;

alter table public.transactions
  add constraint transactions_idempotency_key_length
  check (idempotency_key is null or char_length(idempotency_key) between 8 and 200);

comment on column public.transactions.idempotency_key is
  'Client-generated checkout attempt key, unique per buyer, used to prevent duplicate transactions and Stripe PaymentIntents.';

commit;
