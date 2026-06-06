-- Listing creation system support: storage bucket, category seed data,
-- metadata moderation constraints, and seller-facing database helpers.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  create policy listing_images_storage_public_read
  on storage.objects for select
  using (bucket_id = 'listing-images');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy listing_images_storage_owner_insert
  on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy listing_images_storage_owner_update
  on storage.objects for update
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy listing_images_storage_owner_delete
  on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

insert into public.categories (slug, name, sort_order)
values
  ('electronics', 'Electronics', 10),
  ('home', 'Home', 20),
  ('outdoors', 'Outdoors', 30),
  ('collectibles', 'Collectibles', 40),
  ('vehicles', 'Vehicles', 50),
  ('services', 'Services', 60),
  ('fashion', 'Fashion', 70),
  ('baby-kids', 'Baby & kids', 80),
  ('sports', 'Sports', 90),
  ('books-media', 'Books & media', 100),
  ('other', 'Other', 999)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

do $$
begin
  alter table public.listings
    add constraint listings_metadata_moderation_status_check
    check ((metadata->>'moderation_status') is null or (metadata->>'moderation_status') in ('pending','approved','needs_review','rejected')) not valid;
exception when duplicate_object then null;
end $$;

alter table public.listings validate constraint listings_metadata_moderation_status_check;

create index if not exists listings_seller_status_updated_idx on public.listings(seller_id, status, updated_at desc) where deleted_at is null;
create index if not exists listings_metadata_moderation_idx on public.listings((metadata->>'moderation_status')) where deleted_at is null;
create index if not exists listings_metadata_category_slug_idx on public.listings((metadata->>'category_slug')) where deleted_at is null;

create or replace function public.publish_listing(listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  listing public.listings;
begin
  update public.listings
  set status = 'active',
      published_at = coalesce(published_at, now()),
      updated_at = now(),
      metadata = jsonb_set(metadata, '{moderation_status}', to_jsonb(coalesce(metadata->>'moderation_status', 'pending')), true)
  where id = listing_id
    and seller_id = auth.uid()
    and deleted_at is null
  returning * into listing;

  if listing.id is null then
    raise exception 'Listing not found or not owned by current user';
  end if;

  return listing;
end;
$$;

grant execute on function public.publish_listing(uuid) to authenticated;

commit;
