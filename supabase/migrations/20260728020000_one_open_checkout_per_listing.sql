-- One open checkout per listing. Concurrent payment-intent inserts collide
-- here instead of selling the same item twice. Completed, cancelled, refunded,
-- and disputed rows are not included, so a later sale can start after the
-- previous checkout ends.

create unique index if not exists transactions_one_open_checkout_per_listing_idx
  on public.transactions (listing_id)
  where status in ('pending_payment', 'paid', 'escrowed');
