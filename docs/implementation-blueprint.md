# Complete Implementation Blueprint

## Purpose

This blueprint converts the previously designed platform vision, UX flows, technical architecture, database model, AI agent ecosystem, trust-and-safety framework, market intelligence platform, and commerce operating system into an execution-ready implementation plan.

The recommended build strategy is a **domain-aligned modular monorepo** that starts as a deployable MVP while preserving the service, data, AI, security, and cloud boundaries required to scale into a global, AI-powered commerce operating system.

## 1. Recommended technology stack

### 1.1 Product surfaces

| Surface | Recommended stack | Rationale |
| --- | --- | --- |
| Buyer and seller web app | Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Zustand or Redux Toolkit | Fast iteration, strong SEO, typed UI, route-level rendering choices, and a shared design system. |
| Admin and trust operations console | Next.js, React, TypeScript, component library, role-aware dashboards | Shared frontend platform with stricter RBAC and audit controls. |
| Mobile app | React Native with TypeScript for MVP; native Swift/Kotlin modules where needed | Reuse product logic while keeping a path to native camera, notifications, identity, and location capabilities. |
| Partner/developer portal | Next.js, TypeScript, OpenAPI/GraphQL docs, webhook testing console | Supports the commerce operating system and third-party integrations. |

### 1.2 Backend and platform

| Layer | Recommended stack | Rationale |
| --- | --- | --- |
| API boundary | GraphQL for product aggregation, REST for public partner APIs, gRPC/Protobuf internally | Optimizes frontend composition while keeping internal contracts strict and evolvable. |
| Core services | Go for marketplace, payment, trust, and realtime services; TypeScript for BFFs; Python for AI/data services | Balances performance, productivity, ecosystem maturity, and ML tooling. |
| Workflow orchestration | Temporal | Durable sagas for offers, orders, escrow, disputes, KYC, payouts, moderation, and agent workflows. |
| Event backbone | Kafka-compatible streaming with Schema Registry and transactional outbox | Reliable domain event publication, replayable projections, and real-time feature pipelines. |
| Cache and ephemeral state | Redis or Valkey | Sessions, rate limits, locks, idempotency windows, realtime presence, and hot projections. |
| Search | OpenSearch for MVP; evaluate Vespa for advanced ranking at scale | Keyword, filters, geospatial search, vector retrieval, and operational familiarity. |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki, Tempo, Sentry | End-to-end tracing, metrics, logs, frontend errors, and AI tool-call observability. |

### 1.3 Data, AI, and infrastructure

| Layer | Recommended stack | Rationale |
| --- | --- | --- |
| OLTP | PostgreSQL per service domain for MVP | Strong consistency, operational maturity, relational integrity, and easy regionalization. |
| Financial ledger | Dedicated ledger service on PostgreSQL initially; migrate to CockroachDB/Spanner/YugabyteDB if multi-region financial consistency requires it | Keeps money movement isolated, auditable, and upgradeable. |
| Object storage | S3-compatible storage | Listing media, identity artifacts, dispute evidence, moderation evidence, audit bundles, and ML datasets. |
| Lakehouse and warehouse | Iceberg/Delta plus BigQuery/Snowflake/Databricks SQL | Analytics, market intelligence, experimentation, ML training, and regulatory reporting. |
| Feature store | Feast for MVP; Tecton or managed feature store at scale | Consistent online/offline features for fraud, ranking, pricing, and recommendations. |
| AI model access | Provider gateway for OpenAI/Anthropic/Gemini plus self-hosted vLLM/KServe path | Cost, quality, regional compliance, fallback, and evaluation flexibility. |
| Cloud | AWS-first reference using EKS, RDS/Aurora PostgreSQL, MSK, ElastiCache, OpenSearch, S3, CloudFront/Cloudflare, KMS, WAF | Mature managed services with a clear portability path to GCP or multi-cloud. |
| IaC and GitOps | Terraform/OpenTofu, Helm, Argo CD | Repeatable environments, policy-controlled changes, and auditable deployments. |

## 2. Frontend architecture

### 2.1 Application boundaries

The frontend should be organized as four independently deployable applications that share packages, design tokens, generated API clients, auth helpers, validation schemas, and observability utilities.

```text
apps/
  web/              Buyer/seller marketplace
  mobile/           React Native buyer/seller app
  admin/            Trust, safety, support, finance, and operations console
  partner-portal/   Developer, merchant, and integration portal
packages/
  ui/               Design system and shared components
  config/           Shared TypeScript, lint, test, and build config
  api-client/       Generated clients for GraphQL, REST, and realtime APIs
  domain/           Shared domain types, value objects, and validation schemas
  telemetry/        Frontend tracing, analytics, logging, and feature flags
```

### 2.2 Web app architecture

- Use Next.js app routing with route groups for discovery, listing detail, selling, messages, checkout, account, saved intents, and agent-assisted workflows.
- Use server components for SEO-critical catalog pages and client components for interactive search, messaging, offers, and checkout.
- Use a BFF/API gateway boundary so the frontend never composes direct service-to-service calls.
- Use shared domain schemas for listing creation, offer creation, escrow terms, dispute evidence, and agent action confirmations.
- Use optimistic UI only for reversible actions; offers, payment, escrow, payout, and dispute actions must wait for authoritative service confirmation.
- Capture structured product analytics for search, recommendation, negotiation, safety prompt, checkout, and dispute funnels.

### 2.3 Mobile architecture

- Start with React Native and Expo or bare React Native depending on identity/camera/location requirements.
- Keep local state small and synchronized through typed API clients, push notifications, and realtime subscriptions.
- Implement mobile-first capabilities: image-led listing creation, barcode/OCR capture, location-safe meetup planning, push notifications, secure device signals, and biometric step-up.
- Use platform modules for passkeys, push, secure storage, camera, media compression, liveness vendor SDKs, and device integrity checks.

### 2.4 Admin architecture

- Build role-specific workspaces for trust operations, support, finance operations, partner success, data quality, and AI governance.
- Require strong auth, device posture checks, just-in-time privileged access, field-level authorization, and immutable audit logging.
- Provide queue-based investigation tools with evidence bundles, event timelines, graph context, model reason codes, and human override workflows.

## 3. Backend architecture

### 3.1 Service domains

The platform should start as separate domain modules with service-ready boundaries. The MVP may deploy several domains together, but each domain owns its data model, API contracts, event schemas, and operational SLOs.

| Domain | Primary responsibility |
| --- | --- |
| Identity | Users, sessions, profiles, consents, organizations, roles, OAuth clients, passkeys, and KYC/KYB references. |
| Listings | Listings, media, attributes, category schemas, drafts, publication rules, listing quality, and duplicate checks. |
| Search and discovery | Search indexing, query understanding, semantic retrieval, ranking, recommendations, saved intents, and alerts. |
| Offers and negotiation | Offers, counteroffers, negotiation terms, expiry, automation rules, and agreement-to-offer conversion. |
| Orders and transactions | Order state, checkout, fulfillment milestones, cancellations, returns, and transaction-level state machines. |
| Payments and escrow | Payment orchestration, escrow holds/releases, ledger postings, payouts, refunds, reserves, reconciliation, and financial audit. |
| Messaging and realtime | Conversations, messages, moderation, read receipts, presence, notifications, and realtime gateways. |
| Trust and safety | Risk scoring, fraud events, device intelligence, reputation, moderation, cases, policies, and interventions. |
| AI platform | Agent gateway, tool broker, model gateway, memory, prompt registry, evals, and AI audit logs. |
| Market intelligence | Demand forecasts, pricing comps, seller insights, category trends, cohort analytics, and data products. |
| Partner platform | Partner orgs, inventory sync, webhooks, apps, developer keys, connector jobs, and channel routing. |
| Notifications | Email, push, SMS, in-app notification templates, preferences, delivery logs, and retries. |

### 3.2 API strategy

- External product clients call a gateway/BFF using GraphQL for composed marketplace experiences and REST for simple resource workflows.
- Partner APIs use REST plus webhooks, OAuth scopes, idempotency keys, request signing, pagination, and versioned OpenAPI contracts.
- Internal service APIs use gRPC/Protobuf with explicit ownership and backward-compatible evolution.
- Events are first-class contracts and should be defined in `contracts/events` before implementation.
- Every mutating endpoint accepts idempotency keys and emits an audit event for protected actions.

### 3.3 Workflow and consistency strategy

- Use Temporal for long-running workflows: listing publication, offer expiry, checkout, escrow funding, payout release, disputes, refunds, KYC review, risk review, and agent-supervised automation.
- Use the transactional outbox pattern for every source-of-truth service that emits events.
- Use sagas and compensating actions for cross-domain workflows; avoid distributed transactions outside the financial ledger boundary.
- Keep protected financial actions behind explicit policy decisions, ledger invariants, reconciliation checks, and privileged audit trails.

## 4. AI architecture

### 4.1 AI platform components

| Component | Responsibility |
| --- | --- |
| Agent gateway | Authenticates user/session context, normalizes tasks, retrieves consent, and routes to the correct agent workflow. |
| Policy and consent engine | Checks permissions, automation rules, region rules, risk bands, financial sensitivity, and human-confirmation requirements. |
| Tool broker | Exposes typed marketplace tools to agents with least privilege, schema validation, idempotency, rate limits, and audit logs. |
| Model gateway | Routes requests across approved LLMs, embedding models, rerankers, classifiers, and self-hosted models with cost and latency controls. |
| Prompt and policy registry | Versions prompts, policies, guardrails, tool schemas, model configs, evaluation suites, and rollout flags. |
| Memory service | Stores session memory, user preference memory, transaction memory, and aggregate marketplace intelligence under consent and retention rules. |
| Evaluation platform | Runs offline evals, red-team suites, production traces, task success reviews, hallucination checks, policy adherence checks, and regression gates. |
| AI audit service | Records model versions, prompts, tool calls, decisions, evidence, user confirmations, and escalation outcomes. |

### 4.2 Agent portfolio

- **Buyer agent**: intent translation, discovery, comparisons, offer preparation, escrow explanation, safe meetup planning, and issue resolution.
- **Seller agent**: listing creation, media quality, pricing suggestions, inventory cleanup, response drafting, promotion advice, and performance coaching.
- **Negotiation agent**: offer framing, counteroffer suggestions, agreement extraction, terms validation, and structured offer creation.
- **Pricing agent**: comps, fair-value bands, liquidation strategy, demand forecasts, and price-change recommendations.
- **Fraud detection agent**: evidence summarization, risk reason codes, case triage, policy-aware interventions, and investigator support.
- **Recommendation and discovery agents**: personalized ranking, semantic matching, saved-intent alerts, visual search, and local-market discovery.
- **Support agent**: policy-grounded support, case summaries, refunds/disputes guidance, and human handoff.
- **Escrow monitoring agent**: milestone monitoring, exception detection, evidence requests, and release/refund recommendations.
- **Market intelligence agent**: seller insights, category trends, partner analytics, supply/demand gaps, and pricing opportunities.

### 4.3 AI execution controls

- Agents may draft, recommend, summarize, and prepare sensitive actions, but must not commit payments, escrow releases, refunds, listing removals, account actions, or legally significant outcomes without explicit permission or preconfigured automation rules.
- All tool calls must be typed, policy-checked, rate-limited, traced, and tied to an actor and session.
- Model outputs must be validated before persistence or downstream execution.
- Human escalation is required for high-value transactions, identity uncertainty, elevated risk bands, disputed outcomes, policy ambiguity, and low-confidence model behavior.
- AI memories must be user-visible where practical, consented, editable, erasable, region-aware, and excluded from unrelated tasks.

## 5. Database architecture

### 5.1 Storage boundaries

| Store | Use cases |
| --- | --- |
| PostgreSQL service databases | Users, identities, listings, offers, orders, messages metadata, notifications, partner data, risk cases, and agent workflow metadata. |
| Financial ledger database | Double-entry ledger, escrow account balances, payable/receivable accounts, payout states, refunds, reserves, and reconciliation. |
| Search index | Listings, users/sellers where appropriate, categories, autocomplete, geospatial indexes, and marketplace projections. |
| Vector store | Listing embeddings, image embeddings, intent embeddings, support knowledge embeddings, and semantic recommendation candidates. |
| Redis/Valkey | Cache, sessions, rate limits, idempotency windows, realtime presence, feature hot cache, and distributed locks where appropriate. |
| Object storage | Media, identity documents, evidence, exports, audit bundles, model artifacts, and lakehouse raw zones. |
| Graph store or graph projections | Fraud rings, device clusters, reputation relationships, social trust, and marketplace entity graphs. |
| Lakehouse/warehouse | Analytics facts, behavioral events, experiments, feature generation, market intelligence, and financial reporting. |

### 5.2 Core schemas

Initial domain schemas should include:

- Identity: users, profiles, organizations, roles, sessions, passkeys, consent records, verification checks, addresses, tax profiles.
- Commerce identity: partner accounts, external identities, OAuth clients, API keys, scopes, federation claims.
- Reputation: reputation summaries, reviews, disputes-derived signals, trust badges, confidence scores.
- Listings: listings, listing attributes, media assets, category schemas, listing status history, publication checks.
- Offers: offers, counteroffers, negotiation events, automation rules, agreement snapshots.
- Transactions: orders, line items, fulfillment steps, cancellations, returns, disputes, transaction status history.
- Escrow and ledger: accounts, ledger entries, holds, releases, payouts, refunds, reserves, reconciliation imports.
- Messaging: conversations, participants, messages, moderation decisions, attachments, safety interventions.
- Fraud intelligence: risk events, risk scores, device fingerprints, entity links, cases, decisions, interventions.
- AI: agent sessions, tool calls, memory records, prompt versions, evaluation results, model traces.
- Notifications: templates, preferences, notification jobs, delivery attempts, provider callbacks.
- Analytics: event facts, listing performance, search impressions, conversion funnels, cohort metrics, market intelligence marts.
- Audit: immutable audit events, hash-chain metadata, legal holds, access logs.

### 5.3 Data rules

- Every table uses globally unique, non-enumerable IDs and created/updated timestamps.
- Financial tables are append-only except for operational metadata; balances are derived or reconciled from ledger entries.
- PII is encrypted, tokenized where possible, region-scoped, access-controlled, and excluded from broad analytics by default.
- Search, recommendation, reputation, and analytics are projections from authoritative service databases and event streams.
- High-volume event tables are partitioned by time and region; user-facing domain records are partitioned by region and tenant where needed.
- Audit logs are immutable, WORM-backed, and retained under legal and regulatory policy.

## 6. Cloud architecture

### 6.1 Environment model

| Environment | Purpose |
| --- | --- |
| Local | Docker Compose for app, Postgres, Redis, OpenSearch, Kafka-compatible broker, and Temporal. |
| Preview | Per-PR frontend and selected service deployments with ephemeral databases where practical. |
| Development | Shared integration environment with seeded test data and sandbox PSP/KYC providers. |
| Staging | Production-like cell with full observability, security policies, migration rehearsal, and release validation. |
| Production | Multi-AZ primary region for MVP, plus warm DR region; evolve to active-active regional cells. |

### 6.2 Runtime architecture

- Edge CDN/WAF terminates public traffic and forwards to the API gateway and web origins.
- Kubernetes hosts service workloads, workers, gateways, admin tools, and AI platform services.
- GPU node pools or managed model endpoints serve self-hosted inference when cost, latency, or privacy justify it.
- Managed databases, object stores, search clusters, stream brokers, and cache services reduce initial operational burden.
- Regional cells own user traffic, service databases, search projections, caches, and message storage.
- Global services coordinate identity federation, risk intelligence, model governance, partner catalog metadata, and aggregate analytics.

### 6.3 Reliability strategy

- Define SLOs per domain: browse/search latency, message delivery, listing publication, checkout success, escrow correctness, payout timeliness, agent response latency, and safety decision latency.
- Use graceful degradation: browse and messaging continue during AI outages; checkout continues with manual safety fallback; search falls back to keyword ranking if semantic retrieval fails.
- Run backup restore drills, event replay drills, ledger invariant checks, and regional failover exercises.
- Use queue-based backpressure for notifications, media processing, index updates, model jobs, and partner sync.

## 7. Security architecture

### 7.1 Security principles

- Zero trust for users, admins, partners, workloads, and AI tools.
- Strong identity using OIDC, OAuth2, passkeys/WebAuthn, MFA, device posture, and risk-based step-up.
- Least privilege authorization with RBAC, ABAC, scoped OAuth tokens, just-in-time admin access, and field-level controls.
- Sensitive action policy checks before listing publication, message delivery, offer acceptance, payment authorization, escrow release, payout, refund, dispute resolution, account restriction, and agent tool execution.

### 7.2 Application and data security

- Use mTLS service-to-service communication and SPIFFE/SPIRE or cloud workload identity.
- Store secrets in Vault or cloud secret managers; use KMS/HSM for encryption keys.
- Encrypt data in transit and at rest; use tokenization for payment references and sensitive identifiers.
- Never store raw card or bank credentials; use PSP tokens and regulated partner integrations.
- Add SAST, DAST, SCA, secret scanning, IaC scanning, SBOM generation, signed containers, and provenance attestations to CI/CD.
- Maintain immutable audit logs for admin access, protected user actions, policy decisions, financial operations, and AI tool calls.

### 7.3 Trust and safety controls

- Risk score protected actions in real time using user, device, content, graph, payment, fulfillment, and behavioral signals.
- Apply decision bands from allow to warn, step-up, hold, review, restrict, suspend, or block.
- Moderate listings, media, messages, reviews, partner content, and AI-generated content before or during exposure depending on risk.
- Separate commercial optimization systems from fraud, escrow, compliance, and safety authority.

## 8. CI/CD architecture

### 8.1 Repository workflow

- Use trunk-based development with short-lived branches and protected main.
- Require CODEOWNERS review by domain for high-risk areas: payments, escrow, ledger, identity, trust, AI policy, infrastructure, and migrations.
- Use conventional commits and semantic versioning for packages and contracts.
- Generate API clients and docs from source-of-truth contracts.

### 8.2 CI pipeline

Required checks per pull request:

1. Format, lint, typecheck, and unit tests by workspace.
2. Contract compatibility checks for Protobuf, OpenAPI, GraphQL, and events.
3. Database migration validation, rollback rehearsal, and schema drift checks.
4. Security scans: secrets, SAST, dependency SCA, IaC policy, container scanning, and license checks.
5. AI regression suites for prompts, tools, safety policies, structured outputs, and eval datasets.
6. Build artifacts, container images, SBOMs, signatures, and provenance attestations.
7. Preview deployments for frontend and selected services.

### 8.3 CD pipeline

- Use GitOps with Argo CD or Flux to deploy environment-specific manifests.
- Use progressive delivery: canary, blue/green, feature flags, shadow traffic, and automatic rollback on SLO burn or error budgets.
- Separate application deploys from schema migrations; use expand-contract migration patterns.
- Promote artifacts across environments instead of rebuilding per environment.
- Gate production releases on observability, security, migration, contract, and rollback readiness.

## 9. Team structure

### 9.1 Initial implementation team

| Team | Roles | Ownership |
| --- | --- | --- |
| Product and design | Product lead, marketplace PM, trust PM, UX designer, content designer, research | Roadmap, user journeys, discovery, seller flows, trust experiences, and launch criteria. |
| Frontend platform | Web engineers, mobile engineer, design-system engineer | Web app, mobile app, admin console, partner portal, UI package, analytics instrumentation. |
| Marketplace backend | Backend engineers | Listings, search integration, offers, orders, messaging, notifications, and partner APIs. |
| Payments and commerce | Backend engineer, fintech specialist | Payment orchestration, escrow, ledger, payouts, refunds, reconciliation, tax/financial controls. |
| Trust and safety | Backend engineer, ML/risk engineer, operations lead | Risk scoring, fraud events, moderation, reputation, device intelligence, cases, safety policies. |
| AI platform | AI engineer, ML engineer, backend engineer | Agent gateway, tool broker, model gateway, memory, prompt registry, evals, AI observability. |
| Data and market intelligence | Data engineer, analytics engineer, data scientist | Event taxonomy, warehouse/lakehouse, BI, feature store, pricing, demand forecasts, experiments. |
| Platform engineering | DevOps/SRE/security engineer | Cloud, Kubernetes, IaC, CI/CD, observability, security baseline, incident response. |
| Operations | Support lead, trust ops analysts, finance ops analyst | Case handling, policy feedback loops, payment exceptions, dispute operations, launch readiness. |

### 9.2 Team evolution

- MVP: one cross-functional marketplace squad plus embedded platform, trust, payments, and AI specialists.
- Protected transactions: split payments/trust into dedicated squads due to regulatory and operational risk.
- AI-native scale: add AI governance, model evaluation, ranking/recommendations, and market intelligence squads.
- Commerce OS: add partner platform, developer relations, enterprise integrations, and regional operations teams.

## 10. Development phases

### Phase 0: Repository and foundation setup

- Create monorepo structure, coding standards, environment templates, CI skeleton, IaC skeleton, and local Docker Compose.
- Define initial domain contracts, event naming conventions, API governance, database migration standards, and security baselines.
- Establish product analytics taxonomy and observability conventions.

### Phase 1: MVP marketplace foundation

- Build identity, auth, profiles, listing creation, listing detail, search/browse, messaging, offers, notifications, and basic admin tooling.
- Add media upload, category attributes, basic content moderation, listing quality checks, and manual support workflows.
- Integrate a PSP sandbox for payment authorization while keeping escrow mocked or partner-gated if regulatory setup is not complete.
- Launch basic AI listing assistant, query understanding, and support copilot behind human confirmation.

### Phase 2: Protected transactions and trust

- Implement orders, escrow, ledger, payouts, refunds, disputes, reconciliation, and financial admin workflows.
- Add KYC/KYB integrations, sanctions checks, device intelligence, reputation scoring, risk scoring, and fraud case management.
- Add safe meetup, shipment milestones, protected payment nudges, message safety, and scam interventions.

### Phase 3: AI-native marketplace

- Launch governed buyer, seller, pricing, negotiation, fraud, support, discovery, and escrow monitoring agents.
- Add semantic search, visual search, recommendation feeds, saved-intent alerts, dynamic pricing, and seller coaching.
- Add AI memory, model gateway, eval harness, prompt registry, tool broker, and audit dashboards.

### Phase 4: Commerce operating system

- Launch partner APIs, OAuth apps, webhooks, connector jobs, inventory sync, channel routing, developer portal, and partner analytics.
- Add integrations for ecommerce, POS, liquidation, dealerships, logistics, warranties, insurance, and accounting exports.
- Extend agents to partner workflows under explicit partner and user policies.

### Phase 5: Global scale and marketplace intelligence

- Expand to multi-region cells, active-active browse/search/messaging, regionalized data controls, clean rooms, and advanced experimentation.
- Add market intelligence products, demand forecasting, supply gap detection, category health dashboards, and ecosystem-level reputation federation.
- Mature operations with incident drills, compliance reviews, model risk governance, and financial audit automation.

## Project structure and repository architecture

The repository should be organized around deployable applications, independently owned services, shared contracts, reusable packages, infrastructure, data/AI assets, and operational runbooks.

```text
.
├── apps/
│   ├── web/                    # Buyer/seller marketplace web application
│   ├── mobile/                 # React Native mobile application
│   ├── admin/                  # Trust, support, finance, and operations console
│   └── partner-portal/         # Developer and merchant portal
├── services/
│   ├── identity/               # Users, auth, profiles, consent, orgs, KYC/KYB references
│   ├── listings/               # Listings, categories, media metadata, publication workflow
│   ├── search-discovery/       # Search projections, ranking, recommendations, saved intents
│   ├── offers/                 # Offers, counters, negotiation state, automation rules
│   ├── transactions/           # Orders, fulfillment, returns, disputes state machines
│   ├── payments-escrow/        # PSP orchestration, escrow, ledger, payouts, reconciliation
│   ├── messaging/              # Conversations, messages, realtime delivery, safety hooks
│   ├── trust-safety/           # Risk, fraud, moderation, reputation, device intelligence, cases
│   ├── ai-platform/            # Agent gateway, tool broker, memory, model gateway, evals
│   ├── market-intelligence/    # Pricing, demand, seller insights, category analytics
│   ├── partner-platform/       # Partner APIs, inventory sync, webhooks, connectors
│   └── notifications/          # Email, push, SMS, in-app notifications and preferences
├── packages/
│   ├── ui/                     # Shared design system
│   ├── config/                 # Shared lint, test, TypeScript, build, and release config
│   ├── domain/                 # Shared domain types and validation schemas
│   ├── api-client/             # Generated API clients
│   ├── telemetry/              # Logging, tracing, analytics, and metrics helpers
│   └── testkit/                # Shared fixtures, mocks, contract test helpers
├── contracts/
│   ├── graphql/                # Public product graph schema
│   ├── openapi/                # Partner/public REST API specs
│   ├── protobuf/               # Internal gRPC APIs
│   └── events/                 # Domain event schemas and compatibility rules
├── data/
│   ├── migrations/             # Database migrations by service
│   ├── warehouse/              # dbt models, marts, and analytics tests
│   ├── quality/                # Data quality checks
│   └── seeds/                  # Local/dev seed data
├── ai/
│   ├── prompts/                # Versioned prompts and tool instructions
│   ├── evals/                  # Offline and regression eval suites
│   ├── policies/               # AI execution, consent, safety, and tool policies
│   ├── tools/                  # Tool schemas and mock tool implementations
│   └── memory/                 # Memory schemas, retention rules, and fixtures
├── infra/
│   ├── terraform/              # Cloud infrastructure modules and environments
│   ├── kubernetes/             # Helm charts, manifests, and environment overlays
│   ├── docker/                 # Local containers and base images
│   ├── observability/          # Dashboards, alerts, SLOs, and telemetry collectors
│   └── security/               # Policy-as-code, IAM, secrets, signing, and scan config
├── ops/
│   ├── runbooks/               # Incident, financial, trust, deployment, and DR runbooks
│   ├── playbooks/              # Support, fraud, dispute, partner, and launch playbooks
│   └── policies/               # Operational policies and escalation paths
├── scripts/                    # Developer automation and repository tooling
├── docs/                       # Product, architecture, and implementation documentation
└── .github/
    ├── workflows/              # CI/CD pipelines
    └── ISSUE_TEMPLATE/         # Product, bug, security, and architecture templates
```

### Initial implementation rules

- Start every service with `README.md`, `api/`, `cmd/`, `internal/`, `migrations/`, and `tests/` directories, even if the first implementation is small.
- Keep generated code out of hand-edited packages and make regeneration deterministic.
- Store all API and event contracts before writing service handlers.
- Keep financial code, security policy code, and AI policy/tool execution code under strict CODEOWNERS review.
- Add local mocks for PSP, KYC, notification, shipping, and model providers before integrating real vendors.
- Treat docs, contracts, migrations, evals, and runbooks as release artifacts, not secondary files.
