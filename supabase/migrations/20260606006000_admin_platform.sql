-- Complete admin platform: role permissions, moderation workflows, trust overrides,
-- analytics views, and auditable admin mutations.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role-based admin permissions
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.admin_role as enum ('support', 'moderator', 'risk', 'finance', 'analyst', 'admin', 'super_admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_permission as enum (
    'admin.access',
    'users.read',
    'users.write',
    'users.ban',
    'listings.moderate',
    'fraud.review',
    'reports.review',
    'disputes.decide',
    'transactions.monitor',
    'payments.monitor',
    'ai.monitor',
    'analytics.search',
    'analytics.revenue',
    'trust.override',
    'audit.read',
    'workflows.manage'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_role_permissions (
  role public.admin_role not null,
  permission public.admin_permission not null,
  description text,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

insert into public.admin_role_permissions (role, permission, description)
values
  ('support', 'admin.access', 'Open the admin console'),
  ('support', 'users.read', 'Read user support context'),
  ('support', 'reports.review', 'Review user reports'),
  ('support', 'disputes.decide', 'Handle low-risk disputes'),
  ('support', 'transactions.monitor', 'Read transaction state'),
  ('support', 'audit.read', 'Read relevant audit events'),
  ('moderator', 'admin.access', 'Open the admin console'),
  ('moderator', 'users.read', 'Read user moderation context'),
  ('moderator', 'listings.moderate', 'Approve, reject, or hold listings'),
  ('moderator', 'reports.review', 'Resolve reports'),
  ('moderator', 'fraud.review', 'Review fraud alerts'),
  ('moderator', 'ai.monitor', 'Monitor moderation AI tasks'),
  ('moderator', 'audit.read', 'Read moderation audit events'),
  ('risk', 'admin.access', 'Open the admin console'),
  ('risk', 'users.read', 'Read user risk context'),
  ('risk', 'users.write', 'Write user risk notes and restrictions'),
  ('risk', 'users.ban', 'Suspend, ban, or reinstate accounts'),
  ('risk', 'listings.moderate', 'Moderate risky listings'),
  ('risk', 'fraud.review', 'Review and disposition fraud alerts'),
  ('risk', 'reports.review', 'Review safety reports'),
  ('risk', 'trust.override', 'Create trust score overrides'),
  ('risk', 'audit.read', 'Read audit events'),
  ('finance', 'admin.access', 'Open the admin console'),
  ('finance', 'users.read', 'Read seller payout context'),
  ('finance', 'transactions.monitor', 'Monitor transactions'),
  ('finance', 'payments.monitor', 'Monitor payments and payouts'),
  ('finance', 'disputes.decide', 'Resolve payment disputes'),
  ('finance', 'analytics.revenue', 'View revenue analytics'),
  ('finance', 'audit.read', 'Read finance audit events'),
  ('analyst', 'admin.access', 'Open the admin console'),
  ('analyst', 'analytics.search', 'View search analytics'),
  ('analyst', 'analytics.revenue', 'View revenue analytics'),
  ('analyst', 'transactions.monitor', 'Monitor aggregate transaction data'),
  ('analyst', 'payments.monitor', 'Monitor aggregate payment data'),
  ('analyst', 'audit.read', 'Read audit events'),
  ('admin', 'admin.access', 'Full admin access'),
  ('super_admin', 'admin.access', 'Full super-admin access')
on conflict (role, permission) do update set description = excluded.description;

insert into public.admin_role_permissions (role, permission, description)
select r.role::public.admin_role, p.permission::public.admin_permission, 'Full platform permission'
from (values ('admin'), ('super_admin')) as r(role)
cross join unnest(enum_range(null::public.admin_permission)) as p(permission)
on conflict (role, permission) do nothing;

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.role = 'super_admin' then 'super_admin'::public.admin_role
    when u.role = 'admin' and (u.metadata->>'admin_role') in ('support','moderator','risk','finance','analyst','admin') then (u.metadata->>'admin_role')::public.admin_role
    when u.role = 'admin' then 'admin'::public.admin_role
    else null::public.admin_role
  end
  from public.users u
  where u.id = auth.uid()
    and u.status = 'active'
    and u.role in ('admin', 'super_admin')
$$;

create or replace function public.current_user_has_admin_permission(required_permission public.admin_permission)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_role_permissions arp
    where arp.role = public.current_admin_role()
      and arp.permission = required_permission
  );
$$;

-- -----------------------------------------------------------------------------
-- Moderation workflow primitives
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.admin_workflow_status as enum ('draft', 'active', 'paused', 'retired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_case_status as enum ('new', 'assigned', 'investigating', 'awaiting_user', 'escalated', 'resolved', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_moderation_workflows (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  entity_type text not null check (entity_type in ('user', 'listing', 'report', 'dispute', 'fraud_signal', 'transaction', 'payment', 'ai_task')),
  required_permission public.admin_permission not null,
  stages jsonb not null default '[]'::jsonb,
  escalation_rules jsonb not null default '{}'::jsonb,
  automation_config jsonb not null default '{}'::jsonb,
  status public.admin_workflow_status not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_review_cases (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.admin_moderation_workflows(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  priority integer not null default 50 check (priority between 0 and 100),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status public.admin_case_status not null default 'new',
  reason text not null,
  summary text,
  evidence jsonb not null default '[]'::jsonb,
  assigned_admin_id uuid references public.users(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.admin_review_cases(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  from_status public.admin_case_status,
  to_status public.admin_case_status,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.admin_moderation_workflows (key, name, description, entity_type, required_permission, stages, escalation_rules, automation_config)
values
  ('listing_moderation', 'Listing moderation', 'AI-assisted listing intake, media review, policy decision, and appeal workflow.', 'listing', 'listings.moderate', '["intake", "ai_screen", "human_review", "decision", "appeal"]', '{"critical_sla_hours":4,"high_sla_hours":12,"default_sla_hours":24}', '{"auto_hold_duplicate_images":true,"proof_required_score":70}'),
  ('report_review', 'Report review', 'Central queue for user, listing, message, transaction, and safety reports.', 'report', 'reports.review', '["triage", "assign", "investigate", "resolve", "notify"]', '{"critical_sla_hours":2,"high_sla_hours":8,"default_sla_hours":24}', '{"merge_duplicates":true,"auto_bundle_evidence":true}'),
  ('fraud_alert', 'Fraud alert review', 'Graph-backed fraud disposition with containment and model feedback.', 'fraud_signal', 'fraud.review', '["score", "contain", "graph_review", "disposition", "rule_feedback"]', '{"critical_sla_hours":1,"high_sla_hours":4,"default_sla_hours":12}', '{"auto_freeze_score":95,"auto_hold_payout_score":85}'),
  ('dispute_handling', 'Dispute handling', 'Evidence collection, decision drafting, escrow settlement, and communication workflow.', 'dispute', 'disputes.decide', '["open", "evidence", "review", "settlement", "close"]', '{"critical_sla_hours":24,"default_sla_hours":72}', '{"evidence_reminders":true,"settlement_templates":true}')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  stages = excluded.stages,
  escalation_rules = excluded.escalation_rules,
  automation_config = excluded.automation_config,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Trust score overrides and account restrictions
-- -----------------------------------------------------------------------------

do $$
begin
  create type public.trust_override_status as enum ('pending', 'approved', 'rejected', 'active', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.trust_score_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  status public.trust_override_status not null default 'pending',
  adjustment numeric(5,2) not null check (adjustment between -100 and 100),
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  approved_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_score_overrides_valid_window check (expires_at is null or expires_at > starts_at)
);

create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  restriction_type text not null check (restriction_type in ('warning', 'buying_suspended', 'selling_suspended', 'payments_suspended', 'full_suspension', 'ban')),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'appealed')),
  reason text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_restrictions_valid_window check (expires_at is null or expires_at > starts_at)
);

-- -----------------------------------------------------------------------------
-- Query views for admin surfaces
-- -----------------------------------------------------------------------------

create or replace view public.admin_user_directory as
select
  u.id,
  u.email,
  u.phone,
  u.role,
  u.status,
  u.banned_reason,
  u.created_at,
  u.updated_at,
  p.display_name,
  ts.score as trust_score,
  ts.seller_score,
  ts.buyer_score,
  ts.fraud_risk_level,
  count(distinct r.id) filter (where r.status in ('open','triaged','investigating')) as open_reports,
  count(distinct fs.id) filter (where fs.reviewed_at is null) as open_fraud_signals
from public.users u
left join public.profiles p on p.user_id = u.id
left join public.trust_scores ts on ts.user_id = u.id
left join public.reports r on r.reported_user_id = u.id
left join public.fraud_signals fs on fs.user_id = u.id
group by u.id, p.display_name, ts.score, ts.seller_score, ts.buyer_score, ts.fraud_risk_level;

create or replace view public.admin_listing_moderation_queue as
select
  l.id,
  l.title,
  l.seller_id,
  l.status,
  l.price_amount,
  l.currency,
  l.metadata->>'moderation_status' as moderation_status,
  coalesce(max(fs.risk_score), 0) as max_risk_score,
  count(distinct r.id) filter (where r.status in ('open','triaged','investigating')) as open_reports,
  l.created_at,
  l.updated_at
from public.listings l
left join public.fraud_signals fs on fs.listing_id = l.id
left join public.reports r on r.listing_id = l.id
where l.deleted_at is null
group by l.id;

create or replace view public.admin_payment_monitor as
select
  ep.id,
  ep.transaction_id,
  ep.provider,
  ep.provider_payment_id,
  ep.status,
  ep.amount,
  ep.currency,
  ep.failure_code,
  t.buyer_id,
  t.seller_id,
  t.status as transaction_status,
  ep.created_at,
  ep.updated_at
from public.escrow_payments ep
join public.transactions t on t.id = ep.transaction_id;

create or replace view public.admin_revenue_metrics as
select
  date_trunc('day', t.created_at) as day,
  t.currency,
  count(*) as transactions,
  sum(t.total_amount) as gmv,
  sum(t.marketplace_fee_amount) as marketplace_fees,
  sum(case when t.status = 'refunded' then t.total_amount else 0 end) as refunded_amount,
  avg(case when t.total_amount > 0 then t.marketplace_fee_amount / t.total_amount else null end) as take_rate
from public.transactions t
group by 1, 2;

create or replace view public.admin_search_terms as
select
  coalesce(nullif(trim(query), ''), '[blank]') as query,
  count(*) as searches,
  avg(result_count) as avg_results,
  count(clicked_listing_id) as clicks,
  case when count(*) = 0 then 0 else count(clicked_listing_id)::numeric / count(*) end as click_through_rate,
  max(created_at) as last_seen_at
from public.search_events
group by 1;

-- -----------------------------------------------------------------------------
-- Auditable mutation helpers
-- -----------------------------------------------------------------------------

create or replace function public.record_admin_action(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text,
  p_target_id uuid default null,
  p_reason text default null,
  p_before_state jsonb default null,
  p_after_state jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  action_id uuid;
begin
  insert into public.admin_actions (admin_id, action_type, target_type, target_id, reason, before_state, after_state, metadata)
  values (p_admin_id, p_action_type, p_target_type, p_target_id, p_reason, p_before_state, p_after_state, coalesce(p_metadata, '{}'::jsonb))
  returning id into action_id;

  insert into public.audit_logs (actor_id, actor_type, action, table_name, record_id, old_values, new_values, metadata)
  values (p_admin_id, 'admin', p_action_type, p_target_type, p_target_id, p_before_state, p_after_state, jsonb_build_object('admin_action_id', action_id, 'reason', p_reason) || coalesce(p_metadata, '{}'::jsonb));

  return action_id;
end;
$$;

create or replace function public.admin_set_user_status(
  p_admin_id uuid,
  p_user_id uuid,
  p_status public.user_status,
  p_reason text,
  p_restriction_type text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  action_id uuid;
begin
  select to_jsonb(u) into old_row from public.users u where u.id = p_user_id for update;
  if old_row is null then
    raise exception 'User not found';
  end if;

  update public.users
  set status = p_status,
      banned_reason = case when p_status = 'banned' then p_reason else banned_reason end,
      updated_at = now()
  where id = p_user_id
  returning jsonb_build_object('id', id, 'email', email, 'role', role, 'status', status, 'banned_reason', banned_reason, 'metadata', metadata, 'updated_at', updated_at) into new_row;

  if p_restriction_type is not null then
    insert into public.user_restrictions (user_id, created_by, restriction_type, reason, expires_at)
    values (p_user_id, p_admin_id, p_restriction_type, p_reason, p_expires_at);
  end if;

  action_id := public.record_admin_action(p_admin_id, 'user.status_change', 'users', p_user_id, p_reason, old_row, new_row, jsonb_build_object('status', p_status));
  return action_id;
end;
$$;

create or replace function public.admin_record_listing_decision(
  p_admin_id uuid,
  p_listing_id uuid,
  p_decision text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  new_status public.listing_status;
  action_id uuid;
begin
  select to_jsonb(l) into old_row from public.listings l where l.id = p_listing_id for update;
  if old_row is null then
    raise exception 'Listing not found';
  end if;

  new_status := case when p_decision in ('reject', 'remove', 'hold') then 'removed'::public.listing_status else (old_row->>'status')::public.listing_status end;

  update public.listings
  set status = new_status,
      metadata = jsonb_set(metadata, '{moderation_status}', to_jsonb(p_decision), true) || jsonb_build_object('moderation_reason', p_reason),
      updated_at = now()
  where id = p_listing_id
  returning jsonb_build_object('id', id, 'seller_id', seller_id, 'title', title, 'status', status, 'metadata', metadata, 'updated_at', updated_at) into new_row;

  action_id := public.record_admin_action(p_admin_id, 'listing.moderation_decision', 'listings', p_listing_id, p_reason, old_row, new_row, p_metadata || jsonb_build_object('decision', p_decision));
  return action_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS, triggers, and indexes
-- -----------------------------------------------------------------------------

drop trigger if exists set_admin_moderation_workflows_updated_at on public.admin_moderation_workflows;
create trigger set_admin_moderation_workflows_updated_at before update on public.admin_moderation_workflows for each row execute function public.set_updated_at();

drop trigger if exists set_admin_review_cases_updated_at on public.admin_review_cases;
create trigger set_admin_review_cases_updated_at before update on public.admin_review_cases for each row execute function public.set_updated_at();

drop trigger if exists set_trust_score_overrides_updated_at on public.trust_score_overrides;
create trigger set_trust_score_overrides_updated_at before update on public.trust_score_overrides for each row execute function public.set_updated_at();

drop trigger if exists set_user_restrictions_updated_at on public.user_restrictions;
create trigger set_user_restrictions_updated_at before update on public.user_restrictions for each row execute function public.set_updated_at();

create index if not exists admin_review_cases_queue_idx on public.admin_review_cases (status, severity, priority desc, due_at nulls last);
create index if not exists trust_score_overrides_user_status_idx on public.trust_score_overrides (user_id, status, expires_at);
create index if not exists user_restrictions_user_status_idx on public.user_restrictions (user_id, status, restriction_type);
create index if not exists admin_actions_target_idx on public.admin_actions (target_type, target_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

alter table public.admin_role_permissions enable row level security;
alter table public.admin_moderation_workflows enable row level security;
alter table public.admin_review_cases enable row level security;
alter table public.admin_case_events enable row level security;
alter table public.trust_score_overrides enable row level security;
alter table public.user_restrictions enable row level security;

create policy admin_role_permissions_admin_read on public.admin_role_permissions for select using (public.current_user_has_admin_permission('admin.access'));
create policy admin_moderation_workflows_admin_read on public.admin_moderation_workflows for select using (public.current_user_has_admin_permission('admin.access'));
create policy admin_moderation_workflows_admin_write on public.admin_moderation_workflows for all using (public.current_user_has_admin_permission('workflows.manage')) with check (public.current_user_has_admin_permission('workflows.manage'));
create policy admin_review_cases_admin_read on public.admin_review_cases for select using (public.current_user_has_admin_permission('admin.access'));
create policy admin_review_cases_admin_write on public.admin_review_cases for all using (public.current_user_has_admin_permission('admin.access')) with check (public.current_user_has_admin_permission('admin.access'));
create policy admin_case_events_admin_read on public.admin_case_events for select using (public.current_user_has_admin_permission('admin.access'));
create policy admin_case_events_admin_insert on public.admin_case_events for insert with check (public.current_user_has_admin_permission('admin.access'));
create policy trust_score_overrides_admin_read on public.trust_score_overrides for select using (public.current_user_has_admin_permission('trust.override'));
create policy trust_score_overrides_admin_write on public.trust_score_overrides for all using (public.current_user_has_admin_permission('trust.override')) with check (public.current_user_has_admin_permission('trust.override'));
create policy user_restrictions_admin_read on public.user_restrictions for select using (public.current_user_has_admin_permission('users.read'));
create policy user_restrictions_admin_write on public.user_restrictions for all using (public.current_user_has_admin_permission('users.ban')) with check (public.current_user_has_admin_permission('users.ban'));

commit;
