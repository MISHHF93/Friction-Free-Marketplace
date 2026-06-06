-- Trust and safety engine: verification, scoring, risk flags, image/message/pricing detection, and admin queues.

begin;

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.verification_check_type as enum ('identity', 'email', 'phone', 'id_document', 'payment', 'payout', 'category_proof');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.verification_check_status as enum ('not_started', 'pending', 'verified', 'failed', 'expired', 'waived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.risk_flag_status as enum ('open', 'auto_contained', 'in_review', 'confirmed', 'false_positive', 'resolved', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.risk_flag_severity as enum ('info', 'low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_review_queue_status as enum ('queued', 'assigned', 'investigating', 'waiting_on_user', 'actioned', 'dismissed', 'closed');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Verification and trust badges
-- -----------------------------------------------------------------------------

create table if not exists public.user_verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  check_type public.verification_check_type not null,
  status public.verification_check_status not null default 'not_started',
  provider text,
  provider_check_id text,
  confidence_score numeric(5,2) check (confidence_score is null or confidence_score between 0 and 100),
  required_for text[] not null default array[]::text[],
  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  failure_reason text,
  evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_verification_checks_provider_unique unique (provider, provider_check_id),
  constraint user_verification_checks_unique_active unique (user_id, check_type)
);

create table if not exists public.user_trust_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,
  label text not null,
  description text not null,
  level text not null default 'standard' check (level in ('standard', 'silver', 'gold', 'platinum', 'limited')),
  icon text not null default 'shield-check',
  visibility text not null default 'public' check (visibility in ('public', 'counterparty', 'admin_only')),
  earned_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_trust_badges_unique_active unique (user_id, code)
);

-- -----------------------------------------------------------------------------
-- Risk flags and review queues
-- -----------------------------------------------------------------------------

create table if not exists public.automated_risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  signal_id uuid references public.fraud_signals(id) on delete set null,
  flag_type text not null,
  severity public.risk_flag_severity not null default 'low',
  status public.risk_flag_status not null default 'open',
  score numeric(5,2) not null check (score between 0 and 100),
  threshold numeric(5,2) not null check (threshold between 0 and 100),
  title text not null,
  explanation text not null,
  recommended_action text not null,
  detector_version text not null default 'trust-engine-v1',
  evidence jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automated_risk_flags_has_subject check (user_id is not null or listing_id is not null or message_id is not null or transaction_id is not null)
);

create table if not exists public.admin_review_queue_items (
  id uuid primary key default gen_random_uuid(),
  queue text not null check (queue in ('identity', 'trust_score', 'reports', 'disputes', 'fraud', 'listings', 'messages', 'payments')),
  subject_type text not null check (subject_type in ('user', 'listing', 'message', 'transaction', 'report', 'dispute', 'risk_flag')),
  subject_id uuid not null,
  priority integer not null default 50 check (priority between 0 and 100),
  severity public.risk_flag_severity not null default 'low',
  status public.admin_review_queue_status not null default 'queued',
  title text not null,
  summary text not null,
  source text not null,
  assigned_admin_id uuid references public.users(id) on delete set null,
  due_at timestamptz,
  decision text,
  decision_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- Detection ledgers
-- -----------------------------------------------------------------------------

create table if not exists public.listing_image_fingerprints (
  id uuid primary key default gen_random_uuid(),
  listing_image_id uuid not null references public.listing_images(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  perceptual_hash text not null,
  phash_bits bit(64),
  source text not null default 'worker',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint listing_image_fingerprints_unique_image unique (listing_image_id),
  constraint listing_image_fingerprints_hash_len check (length(perceptual_hash) between 8 and 128)
);

create table if not exists public.duplicate_image_matches (
  id uuid primary key default gen_random_uuid(),
  listing_image_id uuid not null references public.listing_images(id) on delete cascade,
  matched_listing_image_id uuid not null references public.listing_images(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  matched_listing_id uuid not null references public.listings(id) on delete cascade,
  similarity numeric(5,2) not null check (similarity between 0 and 100),
  match_type text not null default 'perceptual_hash' check (match_type in ('perceptual_hash', 'exact_hash', 'external_web', 'manual')),
  status public.risk_flag_status not null default 'open',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint duplicate_image_matches_not_self check (listing_image_id <> matched_listing_image_id)
);

create table if not exists public.pricing_baselines (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  condition text,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  sample_size integer not null check (sample_size > 0),
  median_price numeric(12,2) not null check (median_price >= 0),
  p10_price numeric(12,2) not null check (p10_price >= 0),
  p90_price numeric(12,2) not null check (p90_price >= 0),
  source text not null default 'marketplace_sales',
  computed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_baselines_unique_segment unique (category_id, condition, currency)
);

create table if not exists public.scam_message_detections (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  matched_patterns text[] not null default array[]::text[],
  classification text not null default 'unknown' check (classification in ('safe', 'contact_harvesting', 'off_platform_payment', 'phishing', 'shipping_scam', 'overpayment', 'unknown')),
  action text not null default 'allow' check (action in ('allow', 'warn', 'redact', 'hold', 'block')),
  explanation text,
  detector_version text not null default 'scam-message-v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Scoring formula helpers
-- -----------------------------------------------------------------------------

create or replace function public.clamp_score(value numeric)
returns numeric
language sql
immutable
as $$
  select least(100::numeric, greatest(0::numeric, round(coalesce(value, 0), 2)))
$$;

create or replace function public.trust_identity_points(p_user_id uuid)
returns numeric
language sql
stable
as $$
  select public.clamp_score(
    coalesce(sum(case check_type
      when 'email' then case when status = 'verified' then 12 else 0 end
      when 'phone' then case when status = 'verified' then 12 else 0 end
      when 'identity' then case when status = 'verified' then 16 else 0 end
      when 'id_document' then case when status = 'verified' then 15 else 0 end
      when 'payment' then case when status = 'verified' then 10 else 0 end
      when 'payout' then case when status = 'verified' then 10 else 0 end
      when 'category_proof' then case when status = 'verified' then 5 else 0 end
      else 0 end), 0)
  )
  from public.user_verification_checks
  where user_id = p_user_id and (expires_at is null or expires_at > now())
$$;

create or replace function public.recompute_user_trust_score(p_user_id uuid)
returns public.trust_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_count integer := 0;
  v_avg_rating numeric := 0;
  v_completed integer := 0;
  v_disputes integer := 0;
  v_confirmed_flags integer := 0;
  v_open_flags integer := 0;
  v_identity numeric := 0;
  v_seller numeric := 0;
  v_buyer numeric := 0;
  v_overall numeric := 0;
  v_risk text := 'low';
  v_row public.trust_scores;
begin
  select count(*), coalesce(avg(rating), 0)
    into v_review_count, v_avg_rating
  from public.reviews
  where reviewee_id = p_user_id and status = 'published' and is_public;

  select count(*) into v_completed
  from public.transactions
  where (buyer_id = p_user_id or seller_id = p_user_id) and status = 'completed';

  select count(*) into v_disputes
  from public.disputes d
  join public.transactions t on t.id = d.transaction_id
  where (t.buyer_id = p_user_id or t.seller_id = p_user_id)
    and d.status not in ('closed', 'resolved_buyer', 'resolved_seller');

  select
    count(*) filter (where status = 'confirmed'),
    count(*) filter (where status in ('open', 'auto_contained', 'in_review'))
    into v_confirmed_flags, v_open_flags
  from public.automated_risk_flags
  where user_id = p_user_id;

  v_identity := public.trust_identity_points(p_user_id);

  -- Seller score = identity 25%, successful selling 25%, reviews 30%, dispute health 15%, risk hygiene 5%.
  v_seller := public.clamp_score(
    (v_identity * 0.25) +
    (least(v_completed, 20) * 1.25) +
    ((v_avg_rating / 5) * 30) +
    ((1 - least(1, coalesce(v_disputes::numeric / greatest(v_completed, 1), 0))) * 15) -
    (v_confirmed_flags * 12) - (v_open_flags * 4)
  );

  -- Buyer reliability = identity 30%, completed purchases 20%, reviews 20%, low dispute/no-show rate 20%, risk hygiene 10%.
  v_buyer := public.clamp_score(
    (v_identity * 0.30) +
    (least(v_completed, 20) * 1.00) +
    ((v_avg_rating / 5) * 20) +
    ((1 - least(1, coalesce(v_disputes::numeric / greatest(v_completed, 1), 0))) * 20) +
    10 - (v_confirmed_flags * 10) - (v_open_flags * 3)
  );

  v_overall := public.clamp_score((v_identity * 0.20) + (v_seller * 0.40) + (v_buyer * 0.40));
  v_risk := case when v_confirmed_flags > 0 or v_open_flags >= 3 then 'critical'
                 when v_open_flags = 2 then 'high'
                 when v_open_flags = 1 then 'medium'
                 else 'low' end;

  insert into public.trust_scores (user_id, score, seller_score, buyer_score, review_count, completed_transactions, dispute_rate, fraud_risk_level, computed_at, model_version, signals, updated_at)
  values (p_user_id, v_overall, v_seller, v_buyer, v_review_count, v_completed,
          least(1, coalesce(v_disputes::numeric / greatest(v_completed, 1), 0)), v_risk, now(), 'trust-engine-v1',
          jsonb_build_object('identity_points', v_identity, 'average_rating', v_avg_rating, 'open_flags', v_open_flags, 'confirmed_flags', v_confirmed_flags), now())
  on conflict (user_id) do update set
    score = excluded.score,
    seller_score = excluded.seller_score,
    buyer_score = excluded.buyer_score,
    review_count = excluded.review_count,
    completed_transactions = excluded.completed_transactions,
    dispute_rate = excluded.dispute_rate,
    fraud_risk_level = excluded.fraud_risk_level,
    computed_at = excluded.computed_at,
    model_version = excluded.model_version,
    signals = excluded.signals,
    updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.enqueue_admin_review_for_risk_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.severity in ('high', 'critical') and new.status in ('open', 'auto_contained') then
    insert into public.admin_review_queue_items (queue, subject_type, subject_id, priority, severity, title, summary, source, due_at, metadata)
    values ('fraud', 'risk_flag', new.id,
            case new.severity when 'critical' then 95 when 'high' then 80 else 50 end,
            new.severity, new.title, new.explanation, 'automated_risk_flags',
            now() + case new.severity when 'critical' then interval '2 hours' else interval '1 day' end,
            jsonb_build_object('flag_type', new.flag_type, 'recommended_action', new.recommended_action, 'score', new.score))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.enqueue_admin_review_for_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and new.check_type in ('identity', 'id_document', 'category_proof') then
    insert into public.admin_review_queue_items (queue, subject_type, subject_id, priority, severity, title, summary, source, due_at, metadata)
    values ('identity', 'user', new.user_id, 65, 'medium', 'Verification review required',
            'A user submitted ' || new.check_type::text || ' evidence that requires manual trust review.',
            'user_verification_checks', now() + interval '1 day', jsonb_build_object('verification_check_id', new.id, 'check_type', new.check_type));
  end if;
  return new;
end;
$$;

create trigger automated_risk_flags_set_updated_at before update on public.automated_risk_flags for each row execute function public.set_updated_at();
create trigger user_verification_checks_set_updated_at before update on public.user_verification_checks for each row execute function public.set_updated_at();
create trigger user_trust_badges_set_updated_at before update on public.user_trust_badges for each row execute function public.set_updated_at();
create trigger admin_review_queue_items_set_updated_at before update on public.admin_review_queue_items for each row execute function public.set_updated_at();
create trigger pricing_baselines_set_updated_at before update on public.pricing_baselines for each row execute function public.set_updated_at();
create trigger automated_risk_flags_enqueue after insert on public.automated_risk_flags for each row execute function public.enqueue_admin_review_for_risk_flag();
create trigger user_verification_checks_enqueue after insert or update of status on public.user_verification_checks for each row execute function public.enqueue_admin_review_for_verification();

create index if not exists user_verification_checks_user_status_idx on public.user_verification_checks(user_id, status, check_type);
create index if not exists user_trust_badges_user_visibility_idx on public.user_trust_badges(user_id, visibility, earned_at desc);
create index if not exists automated_risk_flags_status_severity_idx on public.automated_risk_flags(status, severity, created_at desc);
create index if not exists automated_risk_flags_subject_idx on public.automated_risk_flags(user_id, listing_id, message_id, transaction_id);
create index if not exists admin_review_queue_status_priority_idx on public.admin_review_queue_items(status, priority desc, due_at asc nulls last);
create index if not exists listing_image_fingerprints_hash_idx on public.listing_image_fingerprints(perceptual_hash);
create index if not exists duplicate_image_matches_listing_idx on public.duplicate_image_matches(listing_id, similarity desc);
create index if not exists scam_message_detections_score_idx on public.scam_message_detections(risk_score desc, created_at desc);

alter table public.user_verification_checks enable row level security;
alter table public.user_trust_badges enable row level security;
alter table public.automated_risk_flags enable row level security;
alter table public.admin_review_queue_items enable row level security;
alter table public.listing_image_fingerprints enable row level security;
alter table public.duplicate_image_matches enable row level security;
alter table public.pricing_baselines enable row level security;
alter table public.scam_message_detections enable row level security;

create policy user_verification_checks_owner_read on public.user_verification_checks for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy user_verification_checks_owner_insert on public.user_verification_checks for insert with check (user_id = auth.uid() or public.current_user_is_admin());
create policy user_verification_checks_admin_update on public.user_verification_checks for update using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy user_trust_badges_public_read on public.user_trust_badges for select using (visibility = 'public' or user_id = auth.uid() or public.current_user_is_admin());
create policy user_trust_badges_admin_write on public.user_trust_badges for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy automated_risk_flags_subject_read on public.automated_risk_flags for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy automated_risk_flags_admin_write on public.automated_risk_flags for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy admin_review_queue_items_admin_only on public.admin_review_queue_items for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy listing_image_fingerprints_admin_only on public.listing_image_fingerprints for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy duplicate_image_matches_admin_only on public.duplicate_image_matches for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy pricing_baselines_public_read on public.pricing_baselines for select using (true);
create policy pricing_baselines_admin_write on public.pricing_baselines for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy scam_message_detections_admin_or_sender_read on public.scam_message_detections for select using (sender_id = auth.uid() or public.current_user_is_admin());
create policy scam_message_detections_admin_write on public.scam_message_detections for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

insert into public.verification_levels (code, name, description, rank, requirements)
values
  ('contact_verified', 'Contact verified', 'Email and phone are verified.', 11, '{"email": true, "phone": true}'::jsonb),
  ('identity_verified', 'Identity verified', 'Contact and identity checks are verified.', 21, '{"email": true, "phone": true, "identity": true}'::jsonb),
  ('id_verified', 'ID verified', 'Optional government ID verification is complete for higher-risk flows.', 31, '{"email": true, "phone": true, "identity": true, "id_document": true}'::jsonb),
  ('trusted_seller', 'Trusted seller', 'High seller trust score, strong reviews, and low dispute rate.', 40, '{"seller_score_min": 85, "review_count_min": 5}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  rank = excluded.rank,
  requirements = excluded.requirements,
  updated_at = now();

commit;
