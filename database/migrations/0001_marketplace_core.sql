create extension if not exists "pgcrypto";

create type public.user_role as enum ('buyer', 'seller', 'admin', 'super_admin');
create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'paused', 'expired', 'removed');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  role public.user_role not null default 'buyer',
  status text not null default 'active' check (status in ('pending','active','suspended','banned','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  bio text,
  avatar_url text,
  location_label text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null,
  slug text unique,
  description text not null,
  condition text,
  status public.listing_status not null default 'draft',
  price_amount numeric(12,2) not null check (price_amount >= 0),
  currency char(3) not null default 'USD',
  quantity integer not null default 1 check (quantity > 0),
  location_city text,
  location_region text,
  location_country char(2),
  ships_to text[] not null default '{}',
  pickup_available boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  status text not null default 'pending',
  moderation_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

create policy "Public categories are readable" on public.categories for select using (is_active);
create policy "Active listings are readable" on public.listings for select using (status = 'active' and deleted_at is null);
create policy "Sellers manage their listings" on public.listings for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "Listing images follow listing visibility" on public.listing_images for select using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())));
