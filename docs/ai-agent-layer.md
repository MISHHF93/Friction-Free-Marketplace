# AI agent layer

The marketplace AI layer is a shared OpenAI API orchestration tier for eight purpose-built agents. Each agent has an explicit prompt, proposed tool set, inputs, outputs, permissions, memory rules, safety rules, and database access rules. The runtime intentionally separates _drafting and recommendation_ from _confirmed side effects_: agents can propose write, payment, moderation, offer, and publication actions, but the application must require a human confirmation boundary before executing them.

## Runtime architecture

1. **Frontend assistant UI**: `/assistant` renders the agent console, exposes each agent's configuration, and sends requests to the run endpoint.
2. **Agent registry**: `apps/web/lib/ai/agent-definitions.ts` is the source of truth for agent purposes, prompts, tool schemas, memory rules, safety rules, permissions, and database access rules.
3. **OpenAI runner**: `apps/web/lib/ai/runner.ts` calls the OpenAI Chat Completions API with the selected agent's system prompt and function tool definitions. The current route uses `tool_choice: "none"`, so model output contains a proposed tool plan rather than autonomous tool execution.
4. **API routes**:
   - `GET /api/ai/agents` returns the architecture summary and full agent registry.
   - `POST /api/ai/agents/run` validates the request, creates an `ai_tasks` row when Supabase is configured, runs the selected agent, completes the task, and records audit events.
5. **Audit and logging**: `apps/web/lib/ai/audit.ts` writes run starts, completions, failures, safety flags, latency, and token usage into `ai_tasks`, `ai_agent_audit_events`, and `audit_logs` when service-role Supabase credentials are available.
6. **Database migration**: `supabase/migrations/20260606007000_ai_agent_layer.sql` expands the AI agent registry, seeds the eight agents, and creates `ai_agent_audit_events` with row-level security.

## Agents

| Agent | Purpose | Primary tools | Confirmation boundary |
| --- | --- | --- | --- |
| Buyer agent | Help buyers discover trustworthy listings and prepare safe purchase decisions. | `search_listings`, `get_listing_context`, `estimate_price`, `get_user_preferences` | Never places orders, sends offers, or messages sellers without confirmation. |
| Seller agent | Help sellers manage inventory, improve conversion, and draft responses. | `get_listing_context`, `estimate_price`, `draft_negotiation_reply` | Does not publish listing edits, change prices, or send buyer messages without confirmation. |
| Listing creation agent | Convert seller notes and photos into accurate, policy-compliant drafts. | `draft_listing`, `estimate_price`, `score_fraud_risk` | Creates drafts only; publishing requires seller confirmation. |
| Pricing agent | Estimate fair price ranges from comps, condition, demand, and goals. | `estimate_price`, `search_listings`, `get_listing_context` | Never changes prices or promises outcomes. |
| Fraud detection agent | Score suspicious behavior and route risky cases to trust-and-safety review. | `score_fraud_risk`, `get_listing_context`, `create_support_case` | Never bans, suspends, removes listings, or holds funds autonomously. |
| Negotiation assistant | Draft respectful replies, counteroffers, and pickup/shipping terms. | `draft_negotiation_reply`, `estimate_price`, `get_listing_context` | Never sends messages or creates offers without explicit confirmation. |
| Support agent | Answer support questions, collect facts, and escalate disputes or safety issues. | `create_support_case`, `get_listing_context`, `score_fraud_risk` | Never issues refunds, legal advice, or final policy judgments autonomously. |
| Recommendation agent | Recommend relevant listings while respecting preferences and privacy. | `recommend_listings`, `get_user_preferences`, `search_listings` | Creates saved-search drafts only and never infers sensitive attributes. |

## Shared safety rules

- Never fabricate product facts, inventory, shipping commitments, identity verification, payment state, legal guarantees, or platform policy outcomes.
- Do not request or expose payment card data, passwords, government IDs, private addresses, or off-platform contact details.
- When a requested action changes money, account status, trust score, moderation state, or listing publication, return a proposed action and require explicit user or admin confirmation.
- Prefer concise, transparent answers that explain uncertainty and identify data needed to proceed.
- Escalate suspected fraud, threats, harassment, illegal goods, regulated goods, self-harm, or safety-critical disputes to the support or fraud workflow.

## Shared memory rules

- Store only task summaries, stable preferences, and consented marketplace context needed for future marketplace assistance.
- Do not store raw payment details, secrets, private documents, exact home addresses, or sensitive identity attributes in agent memory.
- Expire conversational working memory after task completion unless the user asks to save a preference.
- Persist audit metadata separately from assistant-visible memory.

## Tool definitions

Tools are OpenAI function definitions in the agent registry. They describe permitted inputs, database access, and permission level. The route currently returns tool plans for application review instead of executing tools autonomously.

- `search_listings`: read active listings, ready images, and public seller profile fields.
- `get_listing_context`: read RLS-scoped listing, image, and seller trust context.
- `draft_listing`: draft listing copy and attributes for seller-owned drafts.
- `estimate_price`: read comps and anonymized aggregate offer signals to estimate fair ranges.
- `score_fraud_risk`: write fraud-signal recommendations and evidence references.
- `draft_negotiation_reply`: draft participant-scoped replies and offer proposals.
- `create_support_case`: summarize and route support issues or disputes.
- `get_user_preferences`: read consented own-user preferences, saved searches, and favorites.
- `recommend_listings`: recommend active listings and log recommendation request metadata.

## Audit trail model

Every run should be traceable from user request to model result:

- `ai_tasks`: coarse task state, input summary, output summary, and error state.
- `ai_agent_audit_events`: immutable run event stream with agent type, action, status, safety flags, token usage, latency, and error messages.
- `audit_logs`: platform-wide audit records used by the admin console.

The audit layer intentionally stores summaries and metadata rather than full sensitive prompts. Full payload retention should be opt-in, encrypted, access-controlled, and governed by retention limits.
