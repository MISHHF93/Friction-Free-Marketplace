-- Keep one open sale per listing through dispute and fulfillment.
-- Completed, cancelled, and refunded rows stay outside the index so a later
-- sale can start after the previous one ends. No columns are dropped.

drop index if exists public.transactions_one_open_checkout_per_listing_idx;

create unique index transactions_one_open_checkout_per_listing_idx
  on public.transactions (listing_id)
  where status in (
    'pending_payment',
    'paid',
    'escrowed',
    'shipped',
    'delivered',
    'disputed'
  );
