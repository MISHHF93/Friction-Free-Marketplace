-- New statuses used by dispute settlement. This file only adds labels.
-- The next migration is the first one allowed to use them.

alter type public.transaction_status add value if not exists 'resolving';
alter type public.dispute_status add value if not exists 'resolving';

alter table public.disputes add column if not exists settlement_plan jsonb;
