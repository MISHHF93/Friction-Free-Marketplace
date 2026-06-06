# Backend Architecture: Next.js, Supabase, Stripe Connect, AI, and Realtime

## Purpose

This document defines the implementation-ready backend architecture for the AI-powered marketplace MVP using:

- Next.js Server Actions as the primary product mutation boundary.
- API routes for webhooks, streaming, third-party callbacks, public integrations, and non-form clients.
- Supabase Postgres as the system of record for marketplace, trust, messaging, notification, AI, and audit data.
- Supabase Auth for user identity, sessions, MFA, and JWT claims.
- Supabase Storage for listing media, chat attachments, verification artifacts, dispute evidence, and generated AI assets.
- Supabase Realtime for chat, order status, notifications, typing indicators, offer updates, and moderation queues.
- Stripe Connect for seller onboarding, payment intents, escrow-like holds, transfers, refunds, disputes, and payout reconciliation.
- OpenAI API for listing generation, semantic enrichment, buyer assistance, moderation support, fraud explanations, and admin copilots.
- Meilisearch or Typesense for keyword, faceted, geospatial, and typo-tolerant marketplace search.
- Resend for transactional email.
- PostHog for product analytics, feature flags, funnels, session replay controls, and event-based experimentation.

The design favors a modular monolith inside the Next.js application for the first production release while preserving clear service boundaries that can later move into independent workers or services.

## 1. Backend service map

### 1.1 Runtime boundaries

| Boundary | Primary technology | Responsibility | Notes |
| --- | --- | --- | --- |
| Web app backend | Next.js App Router, React Server Components, Server Actions | Authenticated product reads and mutations, domain orchestration, form submissions, safe redirects | Default backend surface for buyer, seller, and admin UX. |
| Route handlers | Next.js `app/api/**/route.ts` | Webhooks, machine clients, upload signatures, streaming responses, cron endpoints, public callbacks | Must verify signatures and use idempotency keys. |
| Database | Supabase Postgres | Source-of-truth relational data, RLS enforcement, outbox tables, audit records, ledger records | All direct client access must be constrained by RLS. |
| Auth | Supabase Auth | Email/password, magic link, OAuth, MFA, session refresh, JWT claims | App-specific roles are stored in profiles and projected into custom claims where needed. |
| Storage | Supabase Storage | Media and private artifacts | Bucket policies must mirror row ownership and moderation state. |
| Realtime | Supabase Realtime | Subscriptions for chats, notifications, offer updates, order status, admin queues | Use narrow channels and RLS-backed publication tables. |
| Payments | Stripe Connect | Connected accounts, payment intents, application fees, transfers, refunds, disputes, webhooks | Stripe is the external money movement source; Postgres mirrors state and ledger facts. |
| AI gateway module | OpenAI API plus internal policy checks | Prompting, tool execution, structured output validation, embeddings, moderation | No model output should directly mutate high-risk data without validation. |
| Search indexing module | Meilisearch or Typesense | Listing search, seller search, autocomplete, filters, ranking signals | Search is a projection from Postgres and not authoritative. |
| Email module | Resend | Transactional and lifecycle email | Notification service owns templates and delivery logs. |
| Analytics module | PostHog | Product events, feature flags, experiment assignment, funnel metrics | Never send raw secrets, payment tokens, identity documents, or sensitive evidence. |
| Background jobs | Supabase Edge Functions, Vercel Cron, or queue worker | Outbox processing, search indexing, email fanout, AI jobs, risk scoring, reconciliation | Start with scheduled processors; graduate to a durable queue when volume requires it. |

### 1.2 Domain modules

| Domain module | Owns | Key tables | External systems |
| --- | --- | --- | --- |
| Identity | Profiles, roles, organizations, verification state, notification preferences | `profiles`, `organizations`, `organization_members`, `user_roles`, `verification_checks`, `user_consents` | Supabase Auth, Resend, PostHog |
| Listings | Listing drafts, published listings, attributes, media, category schemas, moderation state | `listings`, `listing_attributes`, `listing_media`, `categories`, `listing_status_events` | Supabase Storage, search, OpenAI |
| Search and discovery | Search documents, saved searches, ranking events, click analytics | `search_sync_jobs`, `saved_searches`, `listing_impressions`, `search_events` | Meilisearch or Typesense, PostHog |
| Offers and negotiation | Offers, counteroffers, expirations, agreement snapshots | `offers`, `offer_events`, `agreement_snapshots` | Realtime, notifications, fraud |
| Orders and fulfillment | Orders, order state machine, fulfillment milestones, cancellations, returns | `orders`, `order_items`, `fulfillment_events`, `return_requests` | Stripe, notifications, Realtime |
| Payments and escrow | Checkout sessions, payment intents, holds, releases, transfers, refunds, ledger entries | `payment_intents`, `escrow_holds`, `ledger_accounts`, `ledger_entries`, `payouts`, `refunds` | Stripe Connect |
| Messaging | Conversations, participants, messages, attachments, moderation outcomes, presence | `conversations`, `conversation_participants`, `messages`, `message_attachments`, `message_moderation_events` | Realtime, Storage, OpenAI moderation |
| Trust and safety | Risk signals, fraud scores, cases, reports, disputes, enforcement actions | `risk_events`, `risk_scores`, `fraud_cases`, `reports`, `disputes`, `moderation_actions` | OpenAI, Stripe Radar data, PostHog |
| AI platform | Agent sessions, tool calls, prompts, embeddings, generated outputs, eval results | `ai_sessions`, `ai_tool_calls`, `ai_outputs`, `ai_embeddings`, `prompt_versions`, `ai_evaluations` | OpenAI, search/vector store |
| Notifications | Notification preferences, jobs, templates, delivery attempts, in-app notifications | `notification_preferences`, `notification_jobs`, `notification_deliveries`, `in_app_notifications` | Resend, Realtime |
| Admin and audit | Admin actions, access logs, immutable audit events, legal holds, exports | `admin_actions`, `audit_events`, `data_access_logs`, `legal_holds` | PostHog, Storage |

### 1.3 Recommended repository layout

```text
apps/web/
  app/
    api/                         Route handlers for webhooks, callbacks, streaming, and machine clients
    (marketplace)/               Buyer and seller routes
    admin/                       Admin and moderation routes
  lib/
    actions/                     Server Actions grouped by domain
    auth/                        Supabase server clients, claim helpers, role guards
    db/                          Typed database helpers and transaction utilities
    domain/                      Domain services and validation schemas
    integrations/                Stripe, OpenAI, Resend, PostHog, search clients
    jobs/                        Outbox processors and scheduled jobs
    realtime/                    Channel naming and broadcast helpers
    storage/                     Upload policies and path builders
    telemetry/                   Logging, traces, analytics, audit wrappers
    validation/                  Zod schemas shared by actions and routes
supabase/
  migrations/                    SQL migrations, RLS policies, triggers, functions
  seed.sql                       Local development seed data
  policies/                      Documented policy decisions when SQL is split
```

## 2. API endpoint map

Server Actions are preferred for authenticated browser-driven mutations. API routes are reserved for external systems, streaming, public integration points, webhooks, and clients that cannot call Server Actions.

### 2.1 Public and app API routes

| Method | Route | Purpose | Auth | Idempotency |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | Deployment health check | None | Not required |
| `GET` | `/api/search` | Public listing search for non-RSC clients and mobile clients | Optional Supabase session | Query hash for analytics dedupe |
| `GET` | `/api/listings/[id]/og` | Dynamic Open Graph image or metadata | None | Not required |
| `POST` | `/api/uploads/sign` | Create a constrained upload token or signed upload path | Supabase session | `Idempotency-Key` recommended |
| `POST` | `/api/ai/listing-assistant/stream` | Stream listing copy suggestions or attribute extraction | Supabase session | Request fingerprint |
| `POST` | `/api/ai/buyer-assistant/stream` | Stream buyer assistant responses | Supabase session | Conversation turn ID |
| `POST` | `/api/messages/attachments/scan-callback` | Receive async malware or safety scan results if using external scanner | Service signature | Attachment ID |
| `POST` | `/api/admin/exports` | Start an admin export job | Admin session | `Idempotency-Key` required |
| `GET` | `/api/admin/exports/[id]` | Download or poll an export | Admin session | Not required |

### 2.2 Webhook and callback routes

| Method | Route | Source | Purpose | Required verification |
| --- | --- | --- | --- | --- |
| `POST` | `/api/webhooks/stripe` | Stripe | Payment intent, charge, transfer, account, payout, dispute, refund, and balance events | Stripe signature header, event replay protection |
| `POST` | `/api/webhooks/resend` | Resend | Delivery, bounce, complaint, open, and click events when enabled | Resend webhook signature or shared secret |
| `POST` | `/api/webhooks/supabase/auth` | Supabase | Optional auth lifecycle hooks for custom claims or profile bootstrap | Supabase hook secret |
| `POST` | `/api/webhooks/search/reindex` | Internal scheduler | Reindex stale search documents | Internal service token |
| `POST` | `/api/cron/outbox` | Vercel Cron or scheduler | Process transactional outbox rows | Cron secret |
| `POST` | `/api/cron/risk-scores` | Scheduler | Recompute pending risk scores and fraud cases | Cron secret |
| `POST` | `/api/cron/reconciliation/stripe` | Scheduler | Reconcile Stripe balance transactions and marketplace ledger | Cron secret |
| `POST` | `/api/cron/notifications` | Scheduler | Fan out due notification jobs | Cron secret |
| `POST` | `/api/cron/ai-jobs` | Scheduler | Process queued AI enrichment, embeddings, summaries, and evaluations | Cron secret |

### 2.3 Partner or future mobile API routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/v1/listings` | Partner/mobile listing search and browsing | API key, OAuth, or session |
| `GET` | `/api/v1/listings/[id]` | Listing detail | API key, OAuth, or session |
| `POST` | `/api/v1/offers` | Create offer from non-web client | API key or session |
| `POST` | `/api/v1/orders/[id]/events` | Post fulfillment events from approved integrations | API key or OAuth scope |
| `POST` | `/api/v1/messages` | Send message from mobile or partner client | Session or scoped OAuth |
| `POST` | `/api/v1/reports` | Submit listing, user, or message report | Session or scoped OAuth |

## 3. Server action map

### 3.1 Identity and account actions

| Server Action | Responsibility | Key guards | Side effects |
| --- | --- | --- | --- |
| `completeProfileAction` | Save onboarding profile fields | Authenticated user can update self | Audit event, PostHog profile update |
| `updateAccountSettingsAction` | Update display name, address metadata, preferences | Authenticated user can update self | Audit event, notification preference refresh |
| `startVerificationAction` | Create verification check | Authenticated user, rate limit | Risk event, notification job |
| `submitVerificationArtifactAction` | Bind uploaded identity artifact to verification check | Owner, signed private upload path | Admin queue update |
| `connectStripeAccountAction` | Start or continue Stripe Connect onboarding | Seller role or seller onboarding intent | Stripe account link, audit event |

### 3.2 Listings actions

| Server Action | Responsibility | Key guards | Side effects |
| --- | --- | --- | --- |
| `createListingDraftAction` | Create draft listing | Authenticated seller | Audit event |
| `updateListingDraftAction` | Update draft fields and attributes | Listing owner, editable state | AI enrichment job optional |
| `attachListingMediaAction` | Attach uploaded media row to draft | Listing owner, media owned by user | Moderation scan job, storage metadata update |
| `generateListingCopyAction` | Generate title, description, attributes, and tags | Listing owner, AI quota | AI output row, prompt trace |
| `submitListingForReviewAction` | Move draft to review or publishable state | Listing owner, required fields, risk threshold | Moderation queue, search sync job if auto-approved |
| `publishListingAction` | Publish approved listing | Owner or admin depending status | Search index update, notifications, audit |
| `pauseListingAction` | Pause active listing | Owner or admin | Search delete/update, audit |
| `deleteListingAction` | Soft-delete listing | Owner or admin, no active order | Search delete, audit |

### 3.3 Offer, order, and escrow actions

| Server Action | Responsibility | Key guards | Side effects |
| --- | --- | --- | --- |
| `createOfferAction` | Buyer creates offer | Buyer cannot be seller, listing active, risk allowed | Realtime event, seller notification, fraud score |
| `counterOfferAction` | Seller or buyer counters | Participant, offer open | Realtime event, notification |
| `acceptOfferAction` | Accept latest offer terms | Participant, terms current, risk allowed | Agreement snapshot, checkout initiation |
| `startCheckoutAction` | Create Stripe PaymentIntent for accepted terms | Buyer, accepted offer, idempotency | Stripe PaymentIntent, payment row |
| `confirmOrderAction` | Convert paid payment intent into order | Stripe webhook usually authoritative; action can poll and finalize | Ledger hold, order event, notification |
| `markShippedAction` | Seller records shipment or fulfillment milestone | Seller, order paid, escrow held | Fulfillment event, buyer notification |
| `confirmReceiptAction` | Buyer confirms receipt or satisfaction | Buyer, order deliverable | Escrow release workflow |
| `openDisputeAction` | Buyer or seller opens dispute | Participant, eligible order state | Escrow freeze, admin case, notification |
| `requestRefundAction` | Buyer requests refund | Buyer, policy window | Seller notification, risk event |

### 3.4 Messaging actions

| Server Action | Responsibility | Key guards | Side effects |
| --- | --- | --- | --- |
| `startConversationAction` | Create listing/order-scoped conversation | Authenticated, allowed marketplace context | Participant rows, Realtime event |
| `sendMessageAction` | Persist message | Participant, not blocked, rate limit | AI safety scan, Realtime broadcast, notification job |
| `attachMessageFileAction` | Bind uploaded file to message draft | Participant and storage owner | Safety scan job |
| `markConversationReadAction` | Update read cursor | Participant | Realtime unread update |
| `reportMessageAction` | Report unsafe message | Participant | Trust case, admin queue, audit |

### 3.5 Notification, trust, and admin actions

| Server Action | Responsibility | Key guards | Side effects |
| --- | --- | --- | --- |
| `updateNotificationPreferencesAction` | Save channel preferences | User can update self | Audit event |
| `reportListingAction` | Report listing content | Authenticated user | Trust case, moderation queue |
| `blockUserAction` | Block another user | Authenticated user | Conversation restrictions, audit |
| `moderateListingAction` | Approve, reject, suppress, or request changes | Moderator/admin role | Search sync, seller notification, audit |
| `resolveFraudCaseAction` | Apply fraud decision | Trust role with elevated permission | Enforcement actions, audit, notifications |
| `resolveDisputeAction` | Decide refund, release, split, or escalation | Support/admin role | Stripe refund/transfer action, ledger entries, audit |
| `impersonationGrantAction` | Create temporary support impersonation grant | Admin with break-glass permission | High-severity audit event |

## 4. Authentication flow

### 4.1 User signup and session flow

1. User starts signup with email/password, magic link, or OAuth through Supabase Auth.
2. Supabase Auth creates the auth user and returns a session to the browser through the Supabase SSR helpers.
3. An auth callback or first-request bootstrap action creates the matching `profiles` row if it does not exist.
4. The profile starts with the `buyer` capability and `profile_incomplete` status.
5. Seller actions require completion of seller onboarding fields and Stripe Connect onboarding.
6. Higher-risk actions require additional verification, such as MFA, verified phone, identity check, or admin approval.
7. Server Components and Server Actions create a server-side Supabase client from cookies and fetch the current user on each sensitive request.
8. Middleware refreshes sessions, protects private route groups, and redirects unauthenticated users to login.

### 4.2 Session and claims model

Supabase Auth JWTs should include only compact authorization hints. The database remains authoritative for sensitive decisions.

Recommended custom claim fields:

| Claim | Example | Purpose |
| --- | --- | --- |
| `role` | `user` | Coarse platform role for fast route gating. |
| `app_roles` | `["buyer", "seller"]` | Product capabilities. |
| `org_ids` | `["org_123"]` | Organization membership hints. |
| `admin_level` | `none`, `support`, `moderator`, `trust_admin`, `super_admin` | Admin route gating. |
| `mfa_verified` | `true` | Step-up auth indicator. |
| `risk_band` | `low`, `medium`, `high`, `blocked` | Fast denial or step-up hints. |

Sensitive actions must re-query `profiles`, `user_roles`, `organization_members`, and risk tables inside the transaction instead of trusting stale claims.

### 4.3 Service authentication

- Route handlers that process webhooks verify provider signatures before touching state.
- Scheduled endpoints require a strong cron secret and allowlist where possible.
- Internal processors use the Supabase service role key only on the server, never in client bundles.
- All service-role writes must call domain services that emit audit events and enforce application-level invariants.
- Public API keys should be hashed in Postgres and scoped by route, method, organization, and rate limit bucket.

## 5. Authorization rules

### 5.1 Authorization layers

1. **Route layer**: Middleware blocks unauthenticated access to private route groups and admin areas.
2. **Server Action layer**: Each action validates the current actor, schema, rate limit, ownership, state machine transition, and risk band.
3. **Postgres RLS layer**: Tables enforce row-level read and write permissions for user-scoped access.
4. **Domain policy layer**: Cross-row and cross-domain rules run inside transactions.
5. **Admin policy layer**: Admin actions require explicit permission rows, reason codes, and audit trails.
6. **Storage policy layer**: Bucket paths and object metadata are checked against ownership and attachment rows.
7. **Realtime policy layer**: Subscriptions are limited to rows and channels the actor can read.

### 5.2 Core RLS rules

| Table or bucket | User access | Admin access | Notes |
| --- | --- | --- | --- |
| `profiles` | Read public profile fields; update own editable fields | Read with reason; update constrained fields | Split private PII into separate table if possible. |
| `listings` | Read published active listings; owners read drafts | Moderators read all | Writes only through Server Actions. |
| `listing_media` | Owners manage draft media; public can read approved public media | Moderators can quarantine | Storage policies check object path prefix. |
| `offers` | Participants read and write allowed transitions | Support can read; finance/trust can intervene | State transitions should happen in SQL transactions. |
| `orders` | Buyer and seller read their orders | Support/finance/admin by role | Money-related writes require service role plus domain checks. |
| `ledger_entries` | Users see derived order-facing financial summaries only | Finance/admin read | Raw ledger writes are service-only and append-only. |
| `conversations` and `messages` | Participants read; participants send if not blocked | Moderators read only reported or escalated threads unless break-glass | Consider redaction views for admin. |
| `risk_events` and `risk_scores` | No direct user read | Trust/admin read | User-facing explanations come from reviewed decisions. |
| `reports` and `disputes` | Reporter and involved parties read allowed case status | Trust/support/admin read | Evidence access is restricted. |
| `notification_jobs` | No direct user read | Ops/admin read | Users read `in_app_notifications`. |
| `audit_events` | No direct user read except compliance export views | Admin/auditor read | Append-only. |
| `identity-artifacts` bucket | Owner upload to pending paths; no public read | Verification staff via signed URL with audit | Private bucket. |
| `listing-media` bucket | Owner upload drafts; public read approved derivatives | Moderator quarantine | Original files can remain private. |
| `message-attachments` bucket | Conversation participants read approved attachments | Moderator read when escalated | Malware and policy scan before availability. |
| `dispute-evidence` bucket | Case participants upload and read own/submitted evidence by policy | Support/admin read with reason | Private bucket. |

### 5.3 High-risk operation requirements

| Operation | Required controls |
| --- | --- |
| Change payout destination | MFA, recent login, seller ownership, Stripe account verification, audit event. |
| Release escrow | Order state check, dispute check, risk check, idempotency key, ledger transaction, Stripe transfer confirmation. |
| Refund payment | Support or policy-triggered authorization, idempotency key, ledger reversal, Stripe refund confirmation. |
| View identity artifacts | Verification role, reason code, signed URL expiry, high-severity audit. |
| Admin user suspension | Moderator/trust role, case link, reason code, notification, audit. |
| AI automated action | Tool permission, confidence threshold, policy check, structured output validation, audit trace. |

## 6. File upload flow

### 6.1 Listing media upload

1. User creates or opens a listing draft.
2. Client calls `POST /api/uploads/sign` or a Server Action to request an upload target for a specific purpose, MIME type, byte size, checksum, and listing ID.
3. Backend verifies the user owns the draft listing and that the listing is in an editable state.
4. Backend creates a `listing_media` row with `status = 'pending_upload'`, an expected checksum, and a storage path such as `listing-media/{user_id}/{listing_id}/{media_id}/original`.
5. Client uploads directly to Supabase Storage using the signed upload token or authenticated storage client.
6. Client calls `attachListingMediaAction` with the media ID.
7. Backend verifies the object exists, size and MIME type match expectations, and checksum matches when available.
8. Backend updates media status to `uploaded`, enqueues moderation and derivative-generation jobs, and emits an audit event.
9. Media remains private or unlisted until moderation and transformation complete.
10. Approved public derivatives are written to a public-read path or served through signed URLs, and the listing search document is refreshed.

### 6.2 Private artifact upload

Identity documents, dispute evidence, and message attachments use private buckets with shorter-lived signed URLs. Every read of sensitive private artifacts must produce a `data_access_logs` row with actor, reason, object path, case ID, and expiry time.

### 6.3 Storage bucket design

| Bucket | Visibility | Example path | Lifecycle |
| --- | --- | --- | --- |
| `listing-media` | Public derivatives, private originals | `{owner_id}/{listing_id}/{media_id}/{variant}` | Delete originals after derivative and retention policy if allowed. |
| `message-attachments` | Private | `{conversation_id}/{message_id}/{attachment_id}` | Retain with conversation policy and legal hold overrides. |
| `identity-artifacts` | Private | `{user_id}/{verification_check_id}/{artifact_id}` | Strict retention and deletion workflows. |
| `dispute-evidence` | Private | `{order_id}/{dispute_id}/{evidence_id}` | Retain through dispute, chargeback, and legal windows. |
| `ai-generated-assets` | Mixed | `{user_id}/{session_id}/{asset_id}` | Respect user deletion and model policy records. |
| `audit-exports` | Private | `{request_id}/{bundle_id}` | Short expiry unless legal hold applies. |

## 7. Payment flow

### 7.1 Seller onboarding with Stripe Connect

1. Seller requests onboarding through `connectStripeAccountAction`.
2. Backend creates or retrieves a Stripe Connected Account for the profile or organization.
3. Backend stores `stripe_account_id`, onboarding status, requirements, and capabilities in `seller_payment_accounts`.
4. Backend creates a Stripe Account Link and redirects the seller to Stripe-hosted onboarding.
5. Stripe sends account update webhooks to `/api/webhooks/stripe`.
6. Webhook processor verifies the signature, upserts account requirements, and updates seller capability flags.
7. Seller can publish paid listings only when required Stripe capabilities and marketplace verification rules are satisfied.

### 7.2 Buyer checkout

1. Buyer accepts terms or clicks buy now.
2. `startCheckoutAction` verifies listing availability, seller eligibility, buyer risk, final price, fees, taxes if applicable, and idempotency.
3. Backend creates a `payment_intents` row with `status = 'requires_payment_method'`.
4. Backend creates a Stripe PaymentIntent with destination or separate charges-and-transfers strategy.
5. Client confirms payment with Stripe.js.
6. Stripe sends payment success or failure webhook.
7. Webhook processor finalizes local payment state, creates or updates order records, posts ledger entries, and emits notification and Realtime events.

### 7.3 Recommended Connect charge strategy

Use **separate charges and transfers** for the marketplace escrow-like flow:

- Charge buyer on the platform account.
- Keep funds in platform balance while the order is pending, subject to card network, Stripe, and regulatory constraints.
- Maintain internal escrow hold records and ledger entries in Postgres.
- Transfer seller proceeds to the connected account after release conditions are met.
- Retain application fees according to fee policy.
- Use Stripe refunds before transfer when possible; use transfer reversals when refunding after transfer.

This is not a substitute for regulated escrow licensing analysis. Legal and compliance review must confirm where the marketplace can hold funds, for how long, and under what terms.

## 8. Escrow flow

### 8.1 Escrow state machine

| State | Meaning | Allowed next states |
| --- | --- | --- |
| `not_started` | No payment has been authorized or captured. | `authorized`, `failed`, `cancelled` |
| `authorized` | Payment authorized but not captured where supported. | `captured`, `cancelled`, `failed` |
| `held` | Funds captured and internally held pending fulfillment. | `release_pending`, `refund_pending`, `disputed`, `expired_review` |
| `release_pending` | Release requested and validations passed. | `released`, `blocked`, `disputed` |
| `released` | Seller transfer completed and ledger posted. | `chargeback`, `adjustment_pending` |
| `refund_pending` | Refund requested and validations passed. | `refunded`, `partially_refunded`, `blocked` |
| `disputed` | Escrow frozen due to buyer, seller, Stripe, or admin dispute. | `released`, `refunded`, `split_released`, `chargeback` |
| `chargeback` | External payment dispute received. | `lost`, `won`, `adjustment_pending` |
| `blocked` | Risk, compliance, or operational control stopped movement. | `release_pending`, `refund_pending`, `disputed` |

### 8.2 Ledger requirements

- Use double-entry accounting in `ledger_entries` with immutable rows.
- Every money movement has an idempotency key, external Stripe event ID, order ID, actor, and reason.
- Balances are derived from ledger entries and reconciled to Stripe balance transactions.
- Escrow hold, marketplace fee, seller payable, refund liability, reserve, and chargeback accounts are separate ledger accounts.
- Never update or delete ledger entries; post reversing entries for corrections.

### 8.3 Release workflow

1. Buyer confirms receipt, automatic review window expires, or admin resolves a dispute in favor of release.
2. Backend locks the order and escrow rows in a transaction.
3. Backend verifies no active dispute, no fraud block, no payment provider block, and seller account is payout-capable.
4. Backend creates `release_pending` escrow event and pending ledger entries.
5. Backend calls Stripe Transfer with an idempotency key tied to the escrow release ID.
6. Stripe webhook or synchronous response confirms transfer.
7. Backend posts final ledger entries, updates escrow to `released`, emits order and notification events, and indexes seller performance metrics.

## 9. Chat flow

### 9.1 Conversation creation

1. Buyer starts a listing-scoped conversation or order-scoped conversation.
2. `startConversationAction` verifies the listing/order context and creates `conversations` and `conversation_participants` rows.
3. Conversation participants subscribe to a Realtime channel based on `conversation:{conversation_id}`.
4. Realtime authorization validates the current user is a participant before delivering rows.

### 9.2 Message send

1. Client submits message text and optional attachment references to `sendMessageAction`.
2. Action validates participant status, block lists, rate limits, listing/order context, and message schema.
3. Message is inserted with `moderation_status = 'pending'` or `approved` depending risk.
4. AI moderation and deterministic safety checks evaluate toxicity, scams, off-platform payment attempts, PII leakage, harassment, prohibited goods, and unsafe URLs.
5. Safe messages are broadcast over Supabase Realtime and create notification jobs for offline participants.
6. Risky messages are held, redacted, warned, or escalated to moderation depending policy.
7. Read cursors and unread counts are updated through `markConversationReadAction` and Realtime broadcasts.

### 9.3 Presence and typing

Use Supabase Realtime presence for ephemeral typing and online state. Presence data must not become authoritative order or dispute evidence unless separately persisted by a trusted server process.

## 10. Notification flow

### 10.1 Notification types

| Type | In-app | Email | Realtime | Examples |
| --- | --- | --- | --- | --- |
| Account | Yes | Yes | Optional | Verification status, password/security changes. |
| Listing | Yes | Optional | Yes | Approved, rejected, expired, saved-search match. |
| Offer | Yes | Yes | Yes | New offer, counteroffer, expiration warning. |
| Order | Yes | Yes | Yes | Payment received, shipped, receipt confirmed. |
| Escrow/payment | Yes | Yes | Yes | Refund, release, payout, dispute. |
| Message | Yes | Optional | Yes | New message, attachment approved. |
| Trust and safety | Yes | Yes | Optional | Report received, enforcement action, dispute update. |
| Marketing | Optional | Optional | No | Digest, recommendations, promotions with consent. |

### 10.2 Notification pipeline

1. Domain action or webhook inserts a `notification_jobs` row in the same transaction as the business event.
2. Outbox processor claims due jobs with `FOR UPDATE SKIP LOCKED`.
3. Processor checks user preferences, channel eligibility, quiet hours, suppression rules, and dedupe windows.
4. Processor inserts `in_app_notifications` for in-app delivery.
5. Processor broadcasts Realtime updates to `user:{user_id}:notifications`.
6. Processor sends email through Resend when eligible.
7. Resend delivery webhooks update `notification_deliveries`.
8. PostHog receives non-sensitive lifecycle analytics events for delivery and engagement.

### 10.3 Template governance

- Templates are versioned and stored in code or a controlled table.
- Every template declares category, required variables, PII classification, allowed channels, and unsubscribe behavior.
- Security, payment, and trust notifications must not be suppressed by marketing unsubscribe preferences.

## 11. AI processing flow

### 11.1 AI gateway rules

All OpenAI API calls go through an internal AI gateway module that handles:

- Prompt version selection.
- Input classification and PII minimization.
- Policy checks for allowed tools and actions.
- Model selection and cost ceilings.
- Structured output schemas and validation.
- Safety moderation where appropriate.
- Token, latency, and error logging.
- AI audit traces tied to actor, session, listing, order, or case.

### 11.2 Listing AI flow

1. Seller opens the AI listing creator.
2. Seller uploads images and enters rough notes.
3. Backend verifies ownership of uploaded media and creates an `ai_sessions` row.
4. AI gateway sends approved image references or extracted descriptions plus seller notes to OpenAI.
5. Model returns structured JSON for title, description, category, attributes, condition, price hints, tags, and policy concerns.
6. Backend validates JSON with Zod and stores it in `ai_outputs`.
7. Seller reviews and accepts, edits, or rejects suggestions.
8. Accepted suggestions update the draft listing through normal listing actions.
9. Search embeddings and listing search document updates run asynchronously after publish approval.

### 11.3 Buyer assistant flow

1. Buyer asks for help finding or comparing products.
2. AI gateway classifies intent and retrieves candidate listings from search and Postgres.
3. Model receives only allowed listing fields and buyer preference context.
4. Assistant returns recommendations with explanations and confidence.
5. Client renders citations to actual listing records, not model-invented data.
6. Clicks, saves, and conversions are logged to PostHog and search events tables.

### 11.4 Admin and trust AI flow

1. Admin opens a fraud case, dispute, or moderation queue item.
2. AI summarizes evidence, timeline, policy matches, and recommended next steps.
3. AI cannot finalize enforcement, refunds, escrow release, or account suspension without an authorized human action unless a separately approved automation policy exists.
4. Admin decision is persisted with reason, policy, evidence links, and AI assistance metadata.

## 12. Fraud detection flow

### 12.1 Signal collection

| Signal source | Examples | Storage |
| --- | --- | --- |
| Account | Signup velocity, email domain, MFA status, verification status, profile completeness | `risk_events`, `profiles` |
| Device/session | IP, user agent, device fingerprint hash, impossible travel, bot score | `risk_events` |
| Listing | Prohibited words, image reuse, price anomaly, category risk, duplicate content | `risk_events`, `listing_moderation_events` |
| Messaging | Off-platform payment language, unsafe links, harassment, scripted scam patterns | `message_moderation_events`, `risk_events` |
| Payment | Card failures, Radar outcomes, chargebacks, refund abuse, payout changes | `payment_risk_events`, `risk_events` |
| Marketplace graph | Shared devices, circular transactions, collusive reviews, linked accounts | `entity_links`, `fraud_cases` |
| Behavioral | Search-to-message velocity, offer spam, cancellation rates, dispute rates | `risk_scores` |

### 12.2 Decision pipeline

1. Every sensitive action emits a `risk_events` row.
2. Deterministic rules run synchronously for obvious blocks and step-up requirements.
3. Asynchronous risk scoring aggregates recent events, graph links, Stripe risk data, and moderation results.
4. Risk scores are written to `risk_scores` with model/rule version, features, score, band, and explanation.
5. Medium risk can require MFA, verification, payment method change, delayed payout, or manual review.
6. High risk can block listing publication, message delivery, checkout, escrow release, payout, or account access.
7. Fraud cases are created or updated for clusters of suspicious activity.
8. Admin decisions feed back into rules, model evaluation sets, and PostHog analysis.

### 12.3 Fraud interventions

| Risk band | User experience | Backend action |
| --- | --- | --- |
| Low | Normal flow | Log signals only. |
| Medium | Step-up prompt or delayed action | Require MFA, verification, or review. |
| High | Action blocked or held | Create fraud case, freeze escrow or listing, notify trust team. |
| Critical | Account or payout restricted | Suspend capability, block payouts, escalate to senior trust/admin. |

## 13. Admin moderation flow

### 13.1 Queue sources

Admin moderation queues are populated from:

- Listing submissions with policy concerns.
- User reports for listings, messages, sellers, buyers, and transactions.
- AI moderation flags.
- Fraud score thresholds.
- Stripe disputes and chargebacks.
- Escrow release blocks.
- Identity verification exceptions.
- PostHog anomaly insights or operational alerts.

### 13.2 Review workflow

1. Moderator opens queue filtered by permission and specialty.
2. Backend records a `data_access_logs` row for sensitive case access.
3. Moderator views normalized evidence, risk history, prior reports, account graph, payment status, and AI summary.
4. Moderator selects an action: approve, reject, request changes, warn, remove content, restrict feature, suspend account, refund, release, split, or escalate.
5. Action is validated by role, case state, required reason codes, and dual-control requirements for high-impact outcomes.
6. Domain service applies the decision in a transaction, creates `moderation_actions`, writes `audit_events`, and enqueues notifications.
7. Search index, Realtime channels, listing state, messaging state, payment/escrow state, and profile status update as needed.
8. Case is closed, appealed, or escalated.

### 13.3 Dual control and break-glass

- High-value refunds, escrow overrides, payout freezes, identity document access, and permanent bans require elevated roles or dual approval.
- Break-glass access must require MFA, reason code, short session lifetime, immutable audit event, and retrospective review.
- Admin interfaces must avoid exposing full PII unless the role and case context require it.

## 14. Logging and audit system

### 14.1 Logging layers

| Layer | Tooling | What to record |
| --- | --- | --- |
| Application logs | Structured JSON logs from Next.js runtime and workers | Request ID, actor ID, route/action, domain entity IDs, status, latency, error class. |
| Audit events | Supabase Postgres append-only `audit_events` | Actor, action, entity, old/new summaries, reason, request ID, IP hash, user agent hash. |
| Data access logs | `data_access_logs` | Reads of sensitive PII, identity artifacts, dispute evidence, admin exports. |
| Product analytics | PostHog | Non-sensitive product events, funnels, feature flags, experiments, conversion. |
| Payment audit | Stripe events plus local ledger | Webhook event IDs, balance transaction IDs, idempotency keys, ledger postings. |
| AI observability | `ai_sessions`, `ai_tool_calls`, `ai_outputs`, model traces | Prompt version, model, token usage, latency, structured output validity, safety outcomes. |
| Search observability | Search event tables and search engine stats | Query, filters, result counts, click positions, zero-result queries. |

### 14.2 Audit event schema

Recommended `audit_events` fields:

| Field | Purpose |
| --- | --- |
| `id` | Unique event ID. |
| `occurred_at` | Server timestamp. |
| `actor_type` | `user`, `admin`, `system`, `webhook`, `ai_agent`. |
| `actor_id` | Auth user, admin user, service, or provider identifier. |
| `action` | Stable action name such as `listing.publish` or `escrow.release`. |
| `entity_type` | Domain entity type. |
| `entity_id` | Domain entity ID. |
| `request_id` | Correlates logs, traces, and user request. |
| `idempotency_key` | Links retries for mutations and webhooks. |
| `reason_code` | Required for admin and high-risk actions. |
| `metadata` | Redacted JSON summary. |
| `hash_prev` and `hash_current` | Optional hash chain for tamper evidence. |

### 14.3 Required audit events

Audit these actions at minimum:

- Authentication security changes, MFA enrollment, role changes, and session revocations.
- Profile, payout, address, tax, and verification changes.
- Listing creation, publication, rejection, removal, and deletion.
- Offer creation, acceptance, cancellation, and expiration.
- Payment intent creation, payment confirmation, refund, transfer, payout, and chargeback events.
- Escrow hold, release, freeze, refund, and dispute transitions.
- Message report, moderation hold, content removal, and participant block.
- AI tool calls that read private data or propose state-changing actions.
- Admin data access, exports, impersonation, enforcement, and break-glass events.

### 14.4 Operational practices

- Generate a request ID at the edge and propagate it through Server Actions, route handlers, Supabase writes, Stripe metadata, OpenAI metadata, Resend headers, and PostHog events.
- Use idempotency keys for all payment, webhook, outbox, notification, and AI job processors.
- Store raw provider payloads in a constrained table or private audit bucket with retention rules.
- Redact secrets, tokens, raw payment data, identity documents, and sensitive evidence from application logs.
- Partition high-volume events by month and archive immutable audit bundles to private storage.
- Create dashboards for checkout success, escrow release latency, fraud blocks, moderation backlog, AI cost, email delivery, search zero-result rate, and Realtime message latency.

## Cross-cutting implementation rules

1. Prefer Server Actions for authenticated browser mutations, but keep domain logic in reusable server-only modules.
2. Every mutation validates input with shared schemas before database writes.
3. Every high-value mutation runs inside a Postgres transaction and writes an audit event.
4. Every webhook is signature-verified, idempotent, and replay-safe.
5. Every async side effect is represented by an outbox or job row before the transaction commits.
6. RLS is mandatory for browser-accessible tables; service-role access is server-only and wrapped by domain guards.
7. Search, analytics, notifications, and AI outputs are projections, never the source of truth.
8. Model outputs are suggestions unless an explicit policy authorizes automation.
9. Money movement is represented in both Stripe and the internal ledger, then reconciled.
10. Admin access to sensitive data requires purpose limitation, reason codes, and immutable audit logs.
