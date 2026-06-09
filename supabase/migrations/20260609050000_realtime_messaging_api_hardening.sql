-- Realtime messaging API hardening: indexes, block trigger coverage, and
-- realtime visibility for report/block side effects used by the app/API layer.

begin;

create index if not exists messages_unread_by_conversation_idx
  on public.messages(conversation_id, sender_id, created_at desc)
  where read_at is null and deleted_at is null;

create index if not exists message_attachments_uploader_created_idx
  on public.message_attachments(uploader_id, created_at desc);

create index if not exists reports_conversation_created_idx
  on public.reports(conversation_id, created_at desc)
  where conversation_id is not null;

create index if not exists user_blocks_conversation_idx
  on public.user_blocks(conversation_id, created_at desc)
  where conversation_id is not null;

drop trigger if exists apply_block_to_conversations on public.user_blocks;
create trigger apply_block_to_conversations
after insert or update on public.user_blocks
for each row execute function public.apply_block_to_conversations();

alter table public.user_blocks replica identity full;
alter table public.reports replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.user_blocks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null;
end $$;

commit;
