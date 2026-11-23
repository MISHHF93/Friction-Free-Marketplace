-- r12: self-serve paid sponsored placements.
-- Builds on r11 (ad_placements, ad_campaigns, ad_events, ad-creatives bucket).
-- Additive only: new columns with safe defaults, a new pricing table, replaced
-- policies and functions. Existing admin campaigns keep serving (status 'approved').

begin;

alter table public.ad_campaigns
  add column if not exists source text not null default 'admin',
  add column if not exists status text not null default 'approved',
  add column if not exists advertiser_id uuid references public.users(id) on delete set null,
  add column if not exists run_days integer,
  add column if not exists price_cents integer,
  add column if not exists currency text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_refund_id text,
  add column if not exists submitted_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists client_request_id text;

do $$
begin
  alter table public.ad_campaigns add constraint ad_campaigns_source_check
    check (source in ('admin', 'self_serve'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ad_campaigns add constraint ad_campaigns_status_check
    check (status in ('draft', 'pending_payment', 'paid_pending_review', 'approved', 'active', 'rejected', 'expired'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ad_campaigns add constraint ad_campaigns_self_serve_check
    check (
      source = 'admin'
      or (
        advertiser_id is not null
        and run_days between 1 and 90
        and price_cents is not null and price_cents >= 0
        and currency ~ '^[a-z]{3}$'
        and ends_at is not null
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ad_campaigns add constraint ad_campaigns_rejection_reason_check
    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 1 and 500);
exception when duplicate_object then null;
end $$;

create unique index if not exists ad_campaigns_checkout_session_idx
  on public.ad_campaigns (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists ad_campaigns_client_request_idx
  on public.ad_campaigns (advertiser_id, client_request_id)
  where client_request_id is not null;

create index if not exists ad_campaigns_advertiser_idx
  on public.ad_campaigns (advertiser_id, created_at desc)
  where advertiser_id is not null;

create index if not exists ad_campaigns_status_idx
  on public.ad_campaigns (status, starts_at, ends_at);

-- Price per placement per day. Defaults are placeholders until the owner sets real prices.
create table if not exists public.ad_pricing (
  placement text primary key references public.ad_placements(key) on delete cascade,
  price_cents_per_day integer not null check (price_cents_per_day between 100 and 10000000),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  min_days integer not null default 1,
  max_days integer not null default 30,
  is_placeholder boolean not null default true,
  self_serve_enabled boolean not null default true,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint ad_pricing_days_check check (min_days >= 1 and max_days >= min_days and max_days <= 90)
);

insert into public.ad_pricing (placement, price_cents_per_day, currency, min_days, max_days, is_placeholder)
values
  ('home_top_banner', 2000, 'usd', 1, 30, true),
  ('home_inline', 1500, 'usd', 1, 30, true),
  ('search_inline', 1500, 'usd', 1, 30, true),
  ('category_top', 1000, 'usd', 1, 30, true),
  ('listing_detail_below', 800, 'usd', 1, 30, true),
  ('dashboard_card', 500, 'usd', 1, 30, true)
on conflict (placement) do nothing;

drop trigger if exists ad_pricing_set_updated_at on public.ad_pricing;
create trigger ad_pricing_set_updated_at
  before update on public.ad_pricing
  for each row execute function public.set_updated_at();

alter table public.ad_pricing enable row level security;

drop policy if exists ad_pricing_public_read on public.ad_pricing;
create policy ad_pricing_public_read
  on public.ad_pricing for select
  using (true);

drop policy if exists ad_pricing_admin_update on public.ad_pricing;
create policy ad_pricing_admin_update
  on public.ad_pricing for update
  using (public.current_user_has_admin_permission('ads.manage'))
  with check (public.current_user_has_admin_permission('ads.manage'));

grant select on public.ad_pricing to anon, authenticated, service_role;
grant update on public.ad_pricing to authenticated, service_role;
grant insert, delete on public.ad_pricing to service_role;

-- Public sees only approved, paid (or admin-made), live campaigns.
-- Advertisers see their own campaigns in every state. ads.manage sees all.
drop policy if exists ad_campaigns_public_or_admin_read on public.ad_campaigns;
create policy ad_campaigns_public_or_admin_read
  on public.ad_campaigns for select
  using (
    (
      status in ('approved', 'active')
      and is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
    or (advertiser_id is not null and advertiser_id = auth.uid())
    or public.current_user_has_admin_permission('ads.manage')
  );

-- Advertisers have no direct write policy: drafts, checkout and status changes go
-- through server routes that validate input and price from ad_pricing.

drop policy if exists ad_events_advertiser_read on public.ad_events;
create policy ad_events_advertiser_read
  on public.ad_events for select
  using (
    exists (
      select 1 from public.ad_campaigns c
      where c.id = ad_events.campaign_id
        and c.advertiser_id is not null
        and c.advertiser_id = auth.uid()
    )
  );

-- Count events only for campaigns that are allowed to serve.
create or replace function public.increment_ad_event(p_campaign_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  slot text;
  campaign_status text;
begin
  if p_event not in ('impression', 'click') then
    raise exception 'invalid ad event';
  end if;

  select placement, status into slot, campaign_status from public.ad_campaigns where id = p_campaign_id;
  if slot is null then
    raise exception 'unknown ad campaign';
  end if;
  if campaign_status not in ('approved', 'active') then
    return;
  end if;

  insert into public.ad_events (campaign_id, placement, day, impressions, clicks)
  values (
    p_campaign_id,
    slot,
    timezone('utc', now())::date,
    case when p_event = 'impression' then 1 else 0 end,
    case when p_event = 'click' then 1 else 0 end
  )
  on conflict (campaign_id, day) do update set
    impressions = public.ad_events.impressions + excluded.impressions,
    clicks = public.ad_events.clicks + excluded.clicks;
end;
$$;

revoke all on function public.increment_ad_event(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_ad_event(uuid, text) to service_role;

-- Lifecycle sweep, called from the existing /api/payments/expire-checkouts cron.
create or replace function public.advance_ad_campaign_lifecycle(p_stale_checkout interval default interval '2 hours')
returns table (activated integer, expired integer, reopened integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  n_activated integer := 0;
  n_expired integer := 0;
  n_reopened integer := 0;
begin
  update public.ad_campaigns
     set status = 'expired'
   where source = 'self_serve'
     and status in ('approved', 'active')
     and ends_at is not null
     and ends_at <= now();
  get diagnostics n_expired = row_count;

  update public.ad_campaigns
     set status = 'active'
   where source = 'self_serve'
     and status = 'approved'
     and starts_at <= now()
     and (ends_at is null or ends_at > now());
  get diagnostics n_activated = row_count;

  update public.ad_campaigns
     set status = 'draft'
   where source = 'self_serve'
     and status = 'pending_payment'
     and paid_at is null
     and updated_at < now() - p_stale_checkout;
  get diagnostics n_reopened = row_count;

  return query select n_activated, n_expired, n_reopened;
end;
$$;

revoke all on function public.advance_ad_campaign_lifecycle(interval) from public, anon, authenticated;
grant execute on function public.advance_ad_campaign_lifecycle(interval) to service_role;

commit;
