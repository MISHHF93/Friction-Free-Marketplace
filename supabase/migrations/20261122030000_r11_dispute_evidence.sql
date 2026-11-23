-- Private dispute evidence (text notes and photos). Parties and disputes.decide admins can read.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dispute-evidence',
  'dispute-evidence',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  actor_id uuid not null references public.users(id),
  note text,
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now(),
  constraint dispute_evidence_has_content check (
    (note is not null and length(btrim(note)) > 0)
    or (storage_path is not null and length(btrim(storage_path)) > 0)
  )
);

create index if not exists dispute_evidence_dispute_id_created_at_idx
  on public.dispute_evidence (dispute_id, created_at);

alter table public.dispute_evidence enable row level security;
grant select, insert on public.dispute_evidence to authenticated;

create or replace function public.can_access_dispute_evidence(p_dispute_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_has_admin_permission('disputes.decide'), false)
    or exists (
      select 1
      from public.disputes d
      join public.transactions t on t.id = d.transaction_id
      where d.id = p_dispute_id
        and auth.uid() in (t.buyer_id, t.seller_id)
    );
$$;

revoke all on function public.can_access_dispute_evidence(uuid) from public;
grant execute on function public.can_access_dispute_evidence(uuid) to authenticated;

do $$
begin
  create policy dispute_evidence_select
    on public.dispute_evidence for select
    using (public.can_access_dispute_evidence(dispute_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy dispute_evidence_insert
    on public.dispute_evidence for insert
    with check (
      actor_id = auth.uid()
      and public.can_access_dispute_evidence(dispute_id)
      and exists (
        select 1 from public.disputes d
        where d.id = dispute_id
          and d.status in ('opened', 'awaiting_buyer', 'awaiting_seller', 'under_review')
      )
    );
exception when duplicate_object then null;
end $$;

create or replace function public.can_access_dispute_evidence_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  dispute_id uuid;
begin
  begin
    dispute_id := nullif(split_part(object_name, '/', 1), '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if dispute_id is null then
    return false;
  end if;
  return public.can_access_dispute_evidence(dispute_id);
end;
$$;

revoke all on function public.can_access_dispute_evidence_object(text) from public;
grant execute on function public.can_access_dispute_evidence_object(text) to authenticated;

do $$
begin
  create policy dispute_evidence_storage_select
    on storage.objects for select
    using (bucket_id = 'dispute-evidence' and public.can_access_dispute_evidence_object(name));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy dispute_evidence_storage_insert
    on storage.objects for insert
    with check (
      bucket_id = 'dispute-evidence'
      and public.can_access_dispute_evidence_object(name)
    );
exception when duplicate_object then null;
end $$;

commit;
