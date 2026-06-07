-- Buyer/seller chat hardening for listing-scoped conversations, read receipts,
-- blocked-user enforcement, and participant-only realtime visibility.

begin;

-- Avoid duplicate active buyer/seller threads for the same listing while allowing
-- archived/closed history to remain queryable.
create unique index if not exists conversations_open_listing_participants_idx
  on public.conversations(listing_id, buyer_id, seller_id)
  where status = 'open'::public.conversation_status;

-- Keep buyers/sellers from creating or reopening conversations after either side
-- has blocked the other user.
drop policy if exists conversations_buyer_insert on public.conversations;
create policy conversations_buyer_insert on public.conversations
  for insert
  with check (
    (
      (buyer_id = auth.uid() or seller_id = auth.uid())
      and buyer_id <> seller_id
      and not exists (
        select 1
        from public.user_blocks b
        where (b.blocker_id = buyer_id and b.blocked_id = seller_id)
           or (b.blocker_id = seller_id and b.blocked_id = buyer_id)
      )
    )
    or public.current_user_is_admin()
  );

drop policy if exists conversations_participant_update on public.conversations;
create policy conversations_participant_update on public.conversations
  for update
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin())
  with check (
    (
      auth.uid() in (buyer_id, seller_id)
      and not exists (
        select 1
        from public.user_blocks b
        where (b.blocker_id = buyer_id and b.blocked_id = seller_id)
           or (b.blocker_id = seller_id and b.blocked_id = buyer_id)
      )
    )
    or public.current_user_is_admin()
  );

-- Re-assert participant-only message reads for realtime change feeds and direct
-- selects. Admins retain access for moderation queues.
drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
  for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());

drop policy if exists messages_sender_update on public.messages;
create policy messages_sender_update on public.messages
  for update
  using (sender_id = auth.uid() or public.current_user_is_admin())
  with check (sender_id = auth.uid() or public.current_user_is_admin());

-- Supabase upsert uses update on conflict, so read receipts need both insert and
-- update policies. Users may only acknowledge their own receipt in conversations
-- they participate in.
drop policy if exists message_read_receipts_self_update on public.message_read_receipts;
create policy message_read_receipts_self_update on public.message_read_receipts
  for update
  using (user_id = auth.uid() and public.is_conversation_participant(conversation_id))
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

-- Ensure read receipt upserts refresh the timestamp when the same user views a
-- thread again.
create or replace function public.touch_message_read_receipt()
returns trigger
language plpgsql
as $$
begin
  new.read_at = now();
  return new;
end;
$$;

drop trigger if exists touch_message_read_receipt on public.message_read_receipts;
create trigger touch_message_read_receipt
  before insert or update on public.message_read_receipts
  for each row execute function public.touch_message_read_receipt();

commit;
