-- Production audit hardening: close direct financial writes and enforce dispute uniqueness.

begin;

-- Financial state changes must flow through service-role APIs/RPCs that validate
-- payment provider state, write audit logs, and post ledger entries.
drop policy if exists transactions_participant_insert on public.transactions;
drop policy if exists transactions_participant_update on public.transactions;

drop policy if exists seller_payment_accounts_owner_update_metadata on public.seller_payment_accounts;

do $$
begin
  create policy seller_payment_accounts_admin_update
    on public.seller_payment_accounts
    for update
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());
exception when duplicate_object then null;
end $$;

-- Prevent duplicate active internal disputes for one transaction. Closed legacy
-- states remain outside the constraint so historical records are preserved.
create unique index if not exists disputes_one_active_per_transaction_idx
  on public.disputes (transaction_id)
  where status in ('opened', 'awaiting_buyer', 'awaiting_seller', 'under_review');

commit;
