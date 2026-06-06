-- AI agent layer: expanded agent registry and immutable run audit events.

alter table public.ai_agents drop constraint if exists ai_agents_agent_type_check;
alter table public.ai_agents
  add constraint ai_agents_agent_type_check
  check (agent_type in (
    'buyer',
    'seller',
    'listing_creation',
    'pricing',
    'fraud_detection',
    'negotiation',
    'support',
    'recommendation',
    'moderation',
    'search'
  ));

create unique index if not exists ai_agents_owner_type_unique_idx
  on public.ai_agents(owner_user_id, agent_type);

create table if not exists public.ai_agent_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  agent_type text not null check (agent_type in (
    'buyer',
    'seller',
    'listing_creation',
    'pricing',
    'fraud_detection',
    'negotiation',
    'support',
    'recommendation',
    'moderation',
    'search'
  )),
  task_id uuid references public.ai_tasks(id) on delete set null,
  action text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  safety_flags text[] not null default '{}',
  tool_calls jsonb not null default '[]'::jsonb,
  token_usage jsonb not null default '{}'::jsonb,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_agent_audit_events_actor_created_idx on public.ai_agent_audit_events(actor_id, created_at desc);
create index if not exists ai_agent_audit_events_agent_created_idx on public.ai_agent_audit_events(agent_type, created_at desc);
create index if not exists ai_agent_audit_events_task_idx on public.ai_agent_audit_events(task_id);

alter table public.ai_agent_audit_events enable row level security;

drop policy if exists ai_agent_audit_events_actor_read on public.ai_agent_audit_events;
create policy ai_agent_audit_events_actor_read
  on public.ai_agent_audit_events for select
  using (actor_id = auth.uid() or public.current_user_is_admin());

drop policy if exists ai_agent_audit_events_insert_system on public.ai_agent_audit_events;
create policy ai_agent_audit_events_insert_system
  on public.ai_agent_audit_events for insert
  with check (actor_id = auth.uid() or public.current_user_is_admin() or auth.role() = 'service_role');

insert into public.ai_agents (name, agent_type, status, instructions, permissions, configuration)
values
  ('Buyer agent', 'buyer', 'active', 'Discover trustworthy listings and prepare safe purchase decisions.', '{"read":["active_listings","own_preferences"],"write":["draft_questions"]}'::jsonb, '{"source":"seed","memory":"consented_preferences_only"}'::jsonb),
  ('Seller agent', 'seller', 'active', 'Manage seller workflows and draft buyer-facing responses.', '{"read":["seller_owned_listings","participant_conversations"],"write":["draft_messages","draft_listing_edits"]}'::jsonb, '{"source":"seed","memory":"task_summaries_only"}'::jsonb),
  ('Listing creation agent', 'listing_creation', 'active', 'Create accurate, policy-compliant listing drafts from seller input.', '{"read":["seller_uploads"],"write":["seller_owned_drafts"],"requires_confirmation":["publish_listing"]}'::jsonb, '{"source":"seed","memory":"no_raw_sensitive_documents"}'::jsonb),
  ('Pricing agent', 'pricing', 'active', 'Estimate fair price ranges from comps, condition, and demand.', '{"read":["public_comps","anonymized_aggregates"],"write":["pricing_audit_events"]}'::jsonb, '{"source":"seed","memory":"aggregate_only"}'::jsonb),
  ('Fraud detection agent', 'fraud_detection', 'active', 'Score fraud risk and route high-risk cases to human review.', '{"read":["risk_metadata"],"write":["fraud_signals","audit_logs"],"blocked":["autonomous_enforcement"]}'::jsonb, '{"source":"seed","memory":"evidence_references_only"}'::jsonb),
  ('Negotiation assistant', 'negotiation', 'active', 'Draft respectful negotiation replies and counteroffers.', '{"read":["participant_conversations"],"write":["draft_messages","draft_offers"],"requires_confirmation":["send_message","create_offer"]}'::jsonb, '{"source":"seed","memory":"private_constraints_never_shared"}'::jsonb),
  ('Support agent', 'support', 'active', 'Resolve support questions and escalate disputes or safety concerns.', '{"read":["caller_scoped_cases"],"write":["support_cases","dispute_drafts"]}'::jsonb, '{"source":"seed","memory":"redacted_case_summaries"}'::jsonb),
  ('Recommendation agent', 'recommendation', 'active', 'Recommend relevant listings while respecting preferences and privacy.', '{"read":["active_listings","own_preferences"],"write":["saved_search_drafts"]}'::jsonb, '{"source":"seed","memory":"consented_preferences_only"}'::jsonb)
on conflict do nothing;
