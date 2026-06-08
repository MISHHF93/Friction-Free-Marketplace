-- Realtime buyer/seller chat participant security guarantees.
-- Keeps conversation, message, receipt, typing, report, and block visibility scoped
-- to participants while allowing admins to moderate trusted marketplace workflows.

begin;

-- Conversations are visible only to their buyer, seller, or admins. Creation is
-- allowed only for a participant pair that has not blocked one another.
drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations
  for select
  using (auth.uid() in (buyer_id, seller_id) or public.current_user_is_admin());

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

-- Messages and attachments remain participant-only in direct selects and in
-- Supabase Realtime change delivery, and blocked conversations cannot receive
-- new participant messages.
drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
  for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());

drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages
  for insert
  with check (
    (
      sender_id = auth.uid()
      and public.is_conversation_participant(conversation_id)
      and not public.is_conversation_blocked(conversation_id)
    )
    or public.current_user_is_admin()
  );

drop policy if exists message_attachments_participant_read on public.message_attachments;
create policy message_attachments_participant_read on public.message_attachments
  for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());

-- Receipts and typing indicators may be read by participants, but users can only
-- write their own rows for conversations they participate in.
drop policy if exists message_read_receipts_participant_read on public.message_read_receipts;
create policy message_read_receipts_participant_read on public.message_read_receipts
  for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());

drop policy if exists message_read_receipts_self_insert on public.message_read_receipts;
create policy message_read_receipts_self_insert on public.message_read_receipts
  for insert
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

drop policy if exists message_read_receipts_self_update on public.message_read_receipts;
create policy message_read_receipts_self_update on public.message_read_receipts
  for update
  using (user_id = auth.uid() and public.is_conversation_participant(conversation_id))
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

drop policy if exists typing_indicators_participant_read on public.conversation_typing_indicators;
create policy typing_indicators_participant_read on public.conversation_typing_indicators
  for select
  using (public.is_conversation_participant(conversation_id) or public.current_user_is_admin());

drop policy if exists typing_indicators_self_upsert on public.conversation_typing_indicators;
create policy typing_indicators_self_upsert on public.conversation_typing_indicators
  for all
  using (user_id = auth.uid() and public.is_conversation_participant(conversation_id))
  with check (user_id = auth.uid() and public.is_conversation_participant(conversation_id));

-- Reports and blocks are participant/authenticated-user initiated while admin
-- moderation can still review and resolve reports.
drop policy if exists reports_owner_or_admin_read on public.reports;
create policy reports_owner_or_admin_read on public.reports
  for select
  using (reporter_id = auth.uid() or reported_user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists reports_user_insert on public.reports;
create policy reports_user_insert on public.reports
  for insert
  with check (reporter_id = auth.uid() or public.current_user_is_admin());

drop policy if exists user_blocks_self_read on public.user_blocks;
create policy user_blocks_self_read on public.user_blocks
  for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.current_user_is_admin());

drop policy if exists user_blocks_self_insert on public.user_blocks;
create policy user_blocks_self_insert on public.user_blocks
  for insert
  with check (blocker_id = auth.uid() or public.current_user_is_admin());

-- Ensure chat tables keep publishing changes to Supabase Realtime. Realtime
-- applies the RLS policies above before delivering row changes to clients.
do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_attachments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_read_receipts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_typing_indicators;
exception when duplicate_object then null;
end $$;

commit;
