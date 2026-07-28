# Smart and interactive platform roadmap

**Prepared:** 2026-07-28  
**Scope:** Web, Android, iOS, marketplace intelligence, interaction quality, and production operations  
**Objective:** Turn the current marketplace from a polished collection of workflows into a responsive commerce product that understands context, proposes useful next steps, and safely helps users complete them.

## Executive assessment

The repository already has an unusually strong foundation:

- Buyer, seller, administrator, search, messaging, offer, payment, trust, and listing workflows exist.
- The AI layer has eight scoped agents, authenticated execution, rate limiting, read-only marketplace tools, audit events, safety rules, and a local fallback.
- Search supports Meilisearch with a database and demonstration-data fallback.
- Stripe Connect, Supabase, PostHog, Resend, native Capacitor shells, CI, release workflows, and health checks are represented.
- The global AI assistant is available from the header and changes its default agent based on the current route.

The main limitation is that intelligence is still presented mostly as text. Recommendations are not consistently rendered as marketplace objects, suggested actions are not executable, context is shallow, preference memory is not productized, and success is not measured through a unified event model.

## Product principles

1. **Show, do not merely tell.** AI results should render listings, comparisons, price evidence, safety notices, and actions—not paragraphs alone.
2. **Context should be automatic and visible.** The assistant should know the current listing, conversation, draft, or dashboard without making the user repeat it.
3. **Every consequential action requires confirmation.** Money, messages, listing publication, account state, moderation, and trust changes remain human-controlled.
4. **Intelligence must degrade gracefully.** Search, basic navigation, forms, and commerce remain useful when OpenAI, Meilisearch, or analytics are unavailable.
5. **Recommendations need evidence.** Price, trust, and ranking suggestions must expose their source, freshness, and uncertainty.
6. **Measure completed outcomes.** Optimize for successful searches, replies, listings, safe transactions, and issue resolution—not assistant opens.

## Priority roadmap

### P0 — Product integrity and interaction baseline

These items should be completed before expanding autonomous behavior.

#### 1. Repair text encoding and normalize customer-facing copy

Guard against mojibake and replacement characters across source-controlled UI and documentation, save files as UTF-8, and add a CI check that rejects common corruption sequences.

**Primary files**

- `apps/web/components/ai/global-assistant.tsx`
- `apps/web/components/ai/assistant-console.tsx`
- `docs/`
- `scripts/` for the encoding check

**Acceptance**

- No corrupted characters appear in web, Android, or iOS views.
- CI fails when known mojibake sequences are introduced.

#### 2. Introduce a typed AI response contract

Replace loosely rendered strings with discriminated response blocks:

- `text`
- `listing_collection`
- `listing_comparison`
- `price_estimate`
- `safety_notice`
- `draft_action`
- `navigation_action`
- `human_escalation`

Validate the model response server-side with Zod and version the contract. Preserve a plain-text fallback.

**Primary files**

- `apps/web/lib/ai/agent-definitions.ts`
- `apps/web/lib/ai/runner.ts`
- `apps/web/app/api/ai/agents/run/route.ts`
- `apps/web/components/ai/`

**Acceptance**

- Malformed model output cannot reach the client unchecked.
- Every response displays safely without relying on Markdown HTML.
- Contract version and prompt version are recorded in audit events.

#### 3. Add genuine page context

Create a small context provider that supplies the assistant with the active route and permitted entity IDs. Listing pages should provide `listingId`; messaging should provide `conversationId`; draft pages should provide the owned draft ID; dashboards should provide the authenticated role.

Never trust entity IDs from the browser without server-side ownership/RLS checks.

**Acceptance**

- “Is this fairly priced?” on a listing page evaluates that listing without asking for its ID.
- “Help me reply” in a conversation creates a draft based on participant-visible context.
- The assistant visibly states what context it is using.

#### 4. Complete accessibility behavior for the AI dialog

Add focus trapping, focus restoration to the launcher, labelled status regions, keyboard traversal for results, reduced-motion support, and mobile viewport tests. Avoid forcing background scroll changes without cleanup.

**Acceptance**

- The assistant passes keyboard-only and screen-reader smoke tests.
- Escape closes it, focus returns to “Ask AI,” and background controls cannot receive focus while open.

### P1 — Make AI recommendations useful and actionable

#### 5. Render live marketplace result cards

When tools return listing data, show reusable listing cards with image, price, condition, seller trust, fulfillment, and direct navigation. Comparison results should use a compact comparison table on desktop and stacked attribute cards on mobile.

**Acceptance**

- Search and recommendation answers contain clickable live listings.
- Removed, private, or sold inventory is never recommended.
- Empty and degraded-search states explain what happened and offer a next step.

#### 6. Add a proposal-and-confirmation action system

Implement a two-step pattern:

1. AI produces a typed proposal with a human-readable diff.
2. The user explicitly confirms through a dedicated endpoint protected by authentication, authorization, idempotency, CSRF/origin controls, and audit logging.

Start with low-risk actions:

- Save a search
- Apply AI copy to an owned draft
- Create a message draft without sending it
- Add recommended filters
- Open the correct support/report flow

Do not initially automate checkout, sending offers, publishing, refunds, payouts, enforcement, or dispute decisions.

**Acceptance**

- Proposed changes show before/after values.
- Cancel causes no write.
- Repeated confirmation cannot duplicate the write.
- Every proposal and confirmation has a traceable audit record.

#### 7. Build a smart buyer journey

- Conversational search that converts intent into visible filters
- Shortlist and compare two to six listings
- Explain price, trust, condition, and fulfillment tradeoffs
- Generate seller questions based on missing listing details
- Convert intent into a confirmed saved search
- Recommend safe pickup and transaction steps based on context

**Outcome metrics**

- Search-to-listing-open rate
- Comparison-to-message rate
- Saved-search creation rate
- Successful search rate
- Reported unsafe recommendation rate

#### 8. Build a smart seller coach

- Draft completeness score
- Photo and disclosure checklist
- Comparable-backed price range with freshness and sample size
- Title and description improvement with a reviewable diff
- Performance insights based on views, saves, messages, offers, and age
- Buyer-reply drafts that never send automatically

**Outcome metrics**

- Draft-to-publish completion
- Time to create a complete listing
- Listing-to-message conversion
- Seller adoption of proposed edits
- Edit reversal and complaint rates

#### 9. Make assistance continuous

Preserve an in-session conversation instead of replacing the previous answer on every request. Add “new conversation,” retry, copy, feedback, and concise history. Persist only consented, non-sensitive preferences; provide a settings screen to view and delete them.

**Acceptance**

- Follow-up questions retain relevant context.
- Refresh behavior is intentional and documented.
- Users can clear history and stored preferences independently.

### P1 — Platform intelligence and measurement

#### 10. Establish a unified event taxonomy

The repository contains server-side PostHog support but lacks a visible end-to-end product analytics layer. Define shared typed events for:

- Discovery and filter use
- Listing impressions and opens
- Favorites and saved searches
- Messages and offers
- Checkout funnel stages
- Listing creation stages
- AI open, prompt category, tool success, response latency, fallback, proposal, confirmation, rejection, and feedback
- Errors and recovery

Exclude prompt bodies, message bodies, addresses, payment details, and sensitive identity data.

**Acceptance**

- Events use stable names and versioned properties.
- Consent and privacy behavior match the privacy policy.
- Buyer, seller, and AI funnels can be measured without storing private content.

#### 11. Add assistant quality evaluation

Create a deterministic evaluation set covering discovery, pricing, comparison, seller help, negotiation, fraud, and support. Score:

- Tool selection
- Factual grounding
- Permission compliance
- Hallucination
- Recommendation relevance
- Safety escalation
- Latency
- Fallback quality

Run fast contract cases in pull requests and fuller model evaluations on a schedule or release candidate.

**Release gates**

- Zero unauthorized write claims
- Zero secret/private-data disclosure cases
- At least 95% schema-valid responses
- Defined relevance and tool-selection thresholds
- P95 latency budget documented and monitored

#### 12. Add feedback and recovery loops

Provide useful/not-useful feedback with an optional reason category. Offer retry, refine search, contact support, or continue manually when a tool fails. Feed aggregated reasons into the admin AI task view without exposing private prompt content.

### P2 — Proactive marketplace intelligence

#### 13. Personalized home and dashboards

Add explainable modules:

- “Because you saved…”
- “New in your search”
- “Price changed”
- “Complete your listing”
- “Reply waiting”
- “Seller action recommended”

Require sufficient live data; otherwise use editorial modules rather than pretending demo data is personalized.

#### 14. Smart notifications

Create preference-aware notifications for saved-search matches, meaningful price changes, unanswered transaction messages, expiring offers, payout or verification actions, and safety events. Deduplicate, throttle, and allow per-channel controls.

#### 15. Trust-aware ranking

Blend relevance, freshness, listing completeness, seller trust, fulfillment fit, and value signals while avoiding circular popularity bias. Document rank features, monitor exposure fairness, and give sellers actionable explanations.

#### 16. Native intelligence

Use Capacitor capabilities where they add real value:

- Camera-to-listing flow
- Native share into listing creation
- Deep links to specific AI-supported tasks
- Connectivity-aware queued drafts
- Push notification routing

The hosted server remains authoritative and no server secret enters the native package.

## Technical workstreams

### Data and APIs

- Add migrations for consented AI preferences, conversation summaries, proposals, confirmations, feedback, and event versioning.
- Apply RLS to every user-owned table.
- Add retention and deletion behavior to account deletion.
- Use server-generated IDs and idempotency keys for confirmed writes.
- Return freshness and source metadata with price and recommendation evidence.

### Security and safety

- Keep read tools and write tools separate.
- Re-authorize every entity on the server.
- Add prompt-injection defenses around listing and message content.
- Bound tool results, execution count, response size, and total latency.
- Redact sensitive fields before model calls and audit storage.
- Route fraud, threats, prohibited goods, refunds, payouts, and enforcement to human review.

### Performance

- Stream or progressively reveal responses where supported.
- Set deadlines for model and tool calls.
- Cache only safe public lookup results; never cache private assistant responses.
- Lazy-load the assistant panel and heavy result renderers.
- Track client-perceived latency separately from server latency.

### Reliability

- Define behavior for OpenAI, Meilisearch, Supabase, and analytics outages.
- Add retry only for safe and idempotent operations.
- Use correlation IDs across request, task, audit, tool, and error records.
- Add structured error monitoring and alert thresholds.

## Proposed execution sequence

### Sprint 1 — Reliable interaction

1. Encoding cleanup and CI guard
2. Typed AI response contract
3. Context provider and secure context resolution
4. Accessible multi-turn assistant shell
5. Unit and Playwright coverage

### Sprint 2 — Buyer intelligence

1. Listing result cards
2. Comparison experience
3. Intent-to-filter actions
4. Confirmed saved-search action
5. Buyer funnel analytics

### Sprint 3 — Seller intelligence

1. Draft completeness and evidence-backed pricing
2. Reviewable listing diffs
3. Confirmed draft updates
4. Message drafts
5. Seller outcome analytics

### Sprint 4 — Quality and personalization

1. Evaluation harness
2. Feedback loop and AI operations dashboard
3. Consented preferences
4. Personalized dashboard modules
5. Smart notifications

### Sprint 5 — Native and release hardening

1. Camera/share/deep-link task flows
2. Offline draft resilience
3. Real-device interaction tests
4. Performance, accessibility, privacy, and secret scans
5. Staged rollout with rollback thresholds

## Definition of done

A feature is complete only when:

- It has a useful manual fallback.
- Authorization and RLS are tested.
- AI outputs are schema validated and evidence linked.
- Consequential writes require explicit confirmation.
- Loading, empty, offline, error, and retry states are designed.
- Keyboard, screen-reader, mobile, and reduced-motion behavior pass.
- Product events exclude private content.
- Unit, integration, E2E, and relevant evaluation cases pass in CI.
- Operational dashboards can distinguish success, fallback, rejection, and failure.

## Recommended starting point

Execute **Sprint 1** first. It creates the response contract, context, accessibility, and test foundation required by every later smart feature. Building proactive or write-capable AI before those controls would make the platform appear smarter without making it reliably safer or more useful.
