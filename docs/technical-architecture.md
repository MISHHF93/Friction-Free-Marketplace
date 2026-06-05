# Global AI-Powered Marketplace Technical Architecture

## Executive summary

This document designs a global AI-powered marketplace platform for 100 million users with real-time messaging, user-facing and internal AI agents, escrow payments, fraud detection, global scaling, and active-active multi-region deployment.

The architecture is intentionally cloud-portable, but the reference implementation assumes a modern Kubernetes-based platform running across AWS, Google Cloud, or a hybrid of both. The design favors managed primitives where they create operational leverage, and open standards where portability, governance, and long-term platform control matter.

## Architecture principles

1. **Cell-based global architecture**: Partition the platform into independently operated regional cells to limit blast radius, support data residency, and scale operationally.
2. **Event-first systems**: Treat business facts as durable events and publish them through a governed event backbone.
3. **Strong consistency where money or trust requires it**: Use serializable or externally consistent transactions for escrow, ledgers, identity verification, and high-risk state transitions.
4. **Eventual consistency where user experience tolerates it**: Use asynchronous projections for search, recommendations, analytics, notifications, feeds, and marketplace graph enrichment.
5. **Zero-trust security**: Authenticate and authorize every workload, user, device, service call, and administrative action.
6. **AI as a platform capability**: Centralize model governance, retrieval, tool execution, evaluation, observability, safety, cost controls, and human escalation.
7. **Defense in depth for fraud**: Combine deterministic rules, graph intelligence, machine learning, device intelligence, behavioral analysis, payment risk, and human review.
8. **Operational simplicity at scale**: Prefer repeatable platform patterns, golden paths, infrastructure as code, progressive delivery, automated rollbacks, and strong observability.
9. **Privacy and compliance by design**: Build consent, data minimization, regional storage controls, retention, encryption, audit, and subject-right workflows into the platform.
10. **Product velocity without sacrificing safety**: Use domain-oriented services, typed APIs, event contracts, feature flags, experimentation, policy engines, and automated governance checks.


## Principal architecture stance

This design combines architectural patterns proven at large-scale technology companies:

- **Google-style reliability**: SLO-first engineering, error budgets, globally distributed control planes, automated capacity management, and progressive rollout safety.
- **Amazon-style ownership**: Small domain teams own services, APIs, data contracts, runbooks, cost, and operational metrics end to end.
- **Uber-style marketplace locality**: Regional cells optimize for local liquidity, geospatial matching, fraud patterns, regulatory constraints, and realtime dispatch-like coordination.
- **Stripe-style financial correctness**: Escrow, ledger, payout, reconciliation, disputes, and compliance are treated as regulated financial systems with immutable audit trails and idempotent APIs.
- **Airbnb-style trust and marketplace quality**: Identity, reputation, reviews, messaging safety, content quality, dispute workflows, and human escalation are first-class product infrastructure.

## Scale, SLO, and capacity targets

The reference design assumes the following initial global targets. Actual values should be recalibrated using production telemetry and marketplace mix.

| Area | Target architecture assumption |
| --- | --- |
| Registered users | 100 million global users across multiple legal and residency regions. |
| Monthly active users | 30-50 million MAU with regional traffic skew and event-driven campaign spikes. |
| Peak read traffic | Millions of requests per minute across edge, search, listing, profile, recommendation, and media paths. |
| Peak write traffic | Hundreds of thousands of writes per minute across listings, messages, offers, payments, fraud events, and telemetry. |
| Messaging latency | p95 under 300 ms for send acknowledgement within a region; p95 under 1 second for cross-region delivery. |
| Search freshness | p95 under 10 seconds for listing creates and updates to appear in regional search; under 60 seconds for global projections. |
| Payment correctness | Zero tolerated ledger imbalance; every payment and escrow mutation is idempotent, auditable, and reconciled. |
| Availability | 99.99% for browse/search/messaging, 99.95% for checkout and escrow APIs, and explicit degraded modes during partner outages. |
| Recovery | RPO near zero for ledger and escrow; RTO under 30 minutes for critical regional failover after executive/regulatory approval. |
| AI safety | 100% tool calls policy-checked, logged, reversible where possible, and bounded by user consent and transaction policy. |

## Reference technology choices

The platform is cloud-portable, but the default modern stack is:

- **Compute**: Kubernetes on AWS EKS, Google GKE, or both; Karpenter or Cluster Autoscaler; GPU pools for model inference.
- **Edge**: Cloudflare, Fastly, Akamai, AWS CloudFront, or Google Cloud CDN with bot defense, WAF, and global load balancing.
- **Services**: Go, Java/Kotlin, Rust, Python, and TypeScript; gRPC internally; REST and GraphQL externally.
- **Events**: Apache Kafka-compatible streaming with Schema Registry, Flink for realtime processing, and transactional outbox for reliable publication.
- **Workflow**: Temporal for orders, escrow, payout, dispute, moderation, KYC, and AI agent workflows.
- **Datastores**: PostgreSQL/Aurora/Cloud SQL for service OLTP, Spanner/CockroachDB/YugabyteDB for ledger-grade distributed SQL, Redis/Valkey for cache, object storage for media and audit artifacts.
- **Search and AI retrieval**: OpenSearch, Elasticsearch, Vespa, pgvector, Milvus, Weaviate, Pinecone, or vector-enabled OpenSearch/Vespa depending on latency and operational preference.
- **AI**: OpenAI, Anthropic, Gemini, approved regional providers, and self-hosted open-weight models served by vLLM, Triton, KServe, Ray Serve, or TensorRT-LLM.
- **Data**: Iceberg, Delta Lake, or Hudi lakehouse; BigQuery, Snowflake, Databricks SQL, or Redshift warehouse; DataHub/OpenMetadata catalog; dbt, Great Expectations, Soda, or Deequ quality checks.
- **Security**: OIDC, WebAuthn/passkeys, SPIFFE/SPIRE workload identity, mTLS service mesh, Vault/cloud KMS/HSM, OPA/Cedar policy, SAST/DAST/SCA, SBOMs, and signed containers.

## 1. System architecture

### 1.1 High-level system view

The platform is composed of the following layers:

```text
Clients
  ├─ iOS, Android, Web, Partner APIs, Admin Console
  └─ Edge SDKs for auth, telemetry, messaging, payments, and AI chat

Global edge
  ├─ Anycast DNS and global traffic management
  ├─ CDN, image/video optimization, WAF, bot defense
  ├─ API gateway, GraphQL gateway, WebSocket gateway
  └─ Edge feature flags, device attestation, rate limiting

Regional marketplace cells
  ├─ Marketplace domain services
  ├─ Messaging and realtime services
  ├─ Payments, escrow, ledger, payout, tax, compliance services
  ├─ AI agent runtime and model gateway
  ├─ Fraud, trust, identity, policy, review, dispute services
  ├─ Search, ranking, recommendations, ads, and discovery services
  └─ Data products, streaming, observability, and operations services

Global control plane
  ├─ Identity federation and tenant/user directory metadata
  ├─ Global routing, cell registry, and service catalog
  ├─ Model registry, policy registry, and experiment registry
  ├─ Compliance governance and audit vault
  └─ Infrastructure provisioning and deployment orchestration

Data platform
  ├─ OLTP stores, distributed SQL, document stores, key-value stores
  ├─ Event streaming, stream processing, feature stores
  ├─ Lakehouse, warehouse, graph store, vector store
  ├─ Search clusters and recommendation indexes
  └─ Backup, disaster recovery, archive, and retention services
```

### 1.2 Traffic routing model

The global edge routes each request to a **home cell** or **nearest eligible cell** based on user residency, regulatory requirements, session state, latency, and service health.

Primary routing policies:

- **User home region**: Identity, wallet, escrow, ledgers, disputes, and compliance records are anchored in the user's legal home region.
- **Marketplace locality**: Listings, search, pickup, logistics, and local messaging are served from the marketplace region where the transaction occurs.
- **Active-active reads**: Public catalog, search, media, recommendations, and low-risk profile reads can be served from replicated edge or regional projections.
- **Strongly consistent writes**: Payments, escrow state transitions, ledger postings, high-risk identity changes, and dispute outcomes route to authoritative regional services.
- **Failover routing**: Non-financial traffic can fail over cross-region. Financial traffic fails over only to pre-approved recovery regions with replicated keys, ledger state, and compliance controls.

### 1.3 Cell architecture

A cell is a self-contained deployment unit with compute, data, messaging, observability, and operational boundaries.

Each cell contains:

- Kubernetes clusters per environment and availability zone group.
- Service mesh with mutual TLS, workload identity, retries, circuit breakers, and traffic shaping.
- Regional API gateways and WebSocket gateways.
- Regional event streaming clusters.
- Regional OLTP databases and caches.
- Regional search, vector, and graph indexes.
- Regional AI inference pools for low-latency workloads.
- Regional fraud and risk decision services.
- Regional runbooks, SLOs, dashboards, and on-call ownership.

Recommended first production cells:

- `us-east`, `us-west`, `eu-west`, `eu-central`, `ap-southeast`, `ap-northeast`, `latam`, and `india`.
- Expand by liquidity, regulatory needs, latency, and payment partner coverage.

### 1.4 Capacity assumptions for 100 million users

Indicative design targets:

- 100 million registered users.
- 20 to 35 million monthly active users.
- 5 to 10 million daily active users.
- 250 thousand to 1 million peak concurrent users during major campaigns.
- 10 thousand to 100 thousand peak API requests per second globally, depending on product maturity.
- 5 thousand to 50 thousand peak realtime message events per second globally.
- 1 billion to 10 billion marketplace events per day across listing views, searches, messages, ranking events, payments, fraud signals, notifications, and AI tool calls.
- Petabyte-scale media and event history.

## 2. Service architecture

### 2.0 Domain ownership model

Services are grouped around business capabilities rather than technical layers. Each domain has a single accountable team that owns API contracts, event contracts, data quality, SLOs, dashboards, incident response, and cost controls.

| Domain | Primary responsibilities | Strong consistency boundary |
| --- | --- | --- |
| Identity and trust | Accounts, sessions, devices, verification, reputation, trust profiles, access recovery. | Identity mutations, credential changes, verification state. |
| Marketplace catalog | Listings, categories, attributes, availability, media metadata, seller inventory. | Listing lifecycle and inventory ownership. |
| Discovery | Search, ranking, recommendations, personalization, ads quality, saved searches. | Mostly eventual consistency; source of truth remains domain services. |
| Messaging and realtime | Conversations, presence, typing indicators, read receipts, notifications, safety interlocks. | Conversation membership and message ordering per conversation. |
| Orders and escrow | Offers, checkout, escrow contracts, order state, fulfillment milestones, release eligibility. | Order and escrow state transitions. |
| Financial platform | Payment orchestration, ledger, payouts, refunds, chargebacks, reconciliation, tax. | Ledger postings, money movement, payout state. |
| Risk and compliance | Fraud scoring, policy decisions, sanctions, KYC/KYB, reviews, investigations, holds. | Risk holds, compliance blocks, case outcomes. |
| AI platform | Agent runtime, model gateway, RAG, tools, memory, evaluations, safety policy. | Tool authorization, memory consent, audited agent actions. |
| Data platform | Streaming, lakehouse, warehouse, metrics, experimentation, governance, lineage. | Dataset access policy and governed derived data products. |
| Platform engineering | Kubernetes, service mesh, CI/CD, observability, developer platform, infrastructure. | Production deployment and infrastructure control planes. |

### 2.1 Service taxonomy

The platform should use domain-oriented services with clear ownership and data boundaries.

#### Experience services

- **Web BFF**: Aggregates marketplace APIs for web clients.
- **Mobile BFF**: Optimized APIs for iOS and Android clients.
- **Partner API service**: Public APIs for merchants, logistics providers, insurance partners, and embedded commerce.
- **Admin console service**: Internal tooling for support, risk review, compliance, disputes, and operations.
- **Notification preference service**: Manages user contact channels, consent, quiet hours, and deliverability state.

#### Identity and trust services

- **Identity service**: Authentication, account lifecycle, sessions, account recovery, passkeys, OAuth, and federation.
- **KYC/KYB service**: User and business verification, document collection, vendor orchestration, and status management.
- **Device intelligence service**: Device fingerprinting, attestation, SIM change signals, jailbreak/root detection, and risky emulator detection.
- **Reputation service**: Reviews, ratings, completion history, counterparty outcomes, trust badges, and transaction-specific reputation.
- **Policy service**: Centralized policy evaluation using a policy engine for marketplace, compliance, fraud, and trust rules.

#### Marketplace services

- **Listing service**: Listing creation, status, schema validation, inventory state, category attributes, ownership evidence, and moderation state.
- **Catalog service**: Canonical product/category/entity catalog, attribute ontology, compatibility, brand/model normalization, and condition taxonomy.
- **Pricing service**: Price recommendations, dynamic pricing, comparable sales, seller thresholds, and markdown strategies.
- **Offer service**: Offers, counteroffers, negotiation state, expiration, bundles, and accepted-offer contracts.
- **Order service**: Order lifecycle, buyer/seller commitments, fulfillment selection, cancellation, returns, and completion.
- **Dispute service**: Case lifecycle, evidence collection, policy decisioning, human review, refund recommendations, and appeal workflows.
- **Logistics service**: Shipping labels, local courier, pickup scheduling, lockers, delivery tracking, customs, and returns.
- **Tax service**: Marketplace facilitator taxes, seller tax reporting, invoice generation, and jurisdiction-specific calculations.

#### Payments and financial services

- **Payment orchestration service**: Payment method setup, authorization, capture, refunds, payment retries, 3DS/SCA, and PSP routing.
- **Escrow service**: Escrow contracts, release conditions, holds, partial releases, dispute holds, and regulatory constraints.
- **Ledger service**: Immutable double-entry ledger for user balances, escrow liabilities, fees, taxes, refunds, chargebacks, payouts, and adjustments.
- **Wallet service**: Stored balance, available balance, pending balance, reserve balance, and user-facing wallet views.
- **Payout service**: Seller payouts, instant payout, payout rails, bank account validation, payout holds, and settlement reconciliation.
- **Reconciliation service**: PSP statements, bank settlements, ledger reconciliation, exception management, and finance reporting.
- **Compliance finance service**: Sanctions screening, AML monitoring, suspicious activity workflows, transaction monitoring, and regulatory reports.

#### Messaging and realtime services

- **Conversation service**: Conversation membership, metadata, unread counts, block state, safety state, and retention policy.
- **Message service**: Message persistence, delivery state, attachments, edits, deletes, and moderation hooks.
- **Presence service**: Online status, typing indicators, active device routing, and ephemeral state.
- **Realtime gateway**: WebSocket, WebTransport, or MQTT ingress; fanout; backpressure; and connection lifecycle.
- **Notification service**: Push, email, SMS, in-app notifications, transactional alerts, and notification deduplication.

#### Search, discovery, and growth services

- **Search service**: Query parsing, retrieval, filters, ranking, personalization, and result blending.
- **Recommendation service**: Candidate generation, embeddings, collaborative filtering, contextual ranking, and feed generation.
- **Ads and promotion service**: Sponsored listings, budgets, pacing, auction, attribution, and relevance constraints.
- **Experimentation service**: Feature flags, A/B tests, holdouts, metrics attribution, and guardrail monitoring.
- **SEO service**: Public listing pages, sitemap generation, structured metadata, canonical routing, and cache invalidation.

#### AI platform services

- **AI gateway**: Unified interface to internal and external LLMs, multimodal models, embedding models, and moderation models.
- **Agent runtime**: Durable agent workflows, tool execution, memory, approvals, budget limits, and human escalation.
- **Prompt and policy service**: Prompt templates, safety policies, tool schemas, model constraints, and versioned evaluations.
- **RAG service**: Retrieval over product catalog, policies, help content, user context, listing context, and transaction context.
- **Model evaluation service**: Offline and online evals, hallucination checks, safety regressions, cost-quality tradeoffs, and canary analysis.

#### Risk and operations services

- **Fraud decision service**: Real-time risk scoring for account, listing, message, payment, payout, and dispute events.
- **Rules engine service**: Deterministic rules, allow/deny lists, velocity checks, sanctions controls, and emergency kill switches.
- **Graph risk service**: Entity resolution, collusion rings, mule accounts, device clusters, payment instrument linkage, and marketplace abuse networks.
- **Moderation service**: Listing content moderation, image/video moderation, message safety, prohibited goods detection, and human review queues.
- **Case management service**: Queueing, assignment, SLA tracking, evidence views, agent notes, and quality assurance.

### 2.2 API architecture

Use a layered API model:

- **External REST APIs** for stable partner integrations and payment/logistics webhooks.
- **GraphQL or typed RPC BFF APIs** for client aggregation and rapid product iteration.
- **gRPC APIs** for internal low-latency service-to-service calls.
- **Async events** for state propagation and integration across domains.
- **Webhook platform** for merchant, logistics, insurance, and developer ecosystem integrations.

API governance requirements:

- Every API has an owner, schema, versioning strategy, SLO, auth model, rate limit, and data classification.
- Use OpenAPI, Protobuf, GraphQL schema registry, and event schema registry.
- Enforce backward compatibility in CI.
- Use idempotency keys for all financial, order, listing state, and partner write APIs.

### 2.3 Service communication patterns

Use synchronous calls only for user-facing decisions requiring immediate response. Use events for propagation and downstream processing.

Examples:

- Listing creation synchronously validates schema and auth, then asynchronously triggers moderation, search indexing, embedding generation, pricing, recommendation indexing, and seller coaching.
- Offer acceptance synchronously creates an order and escrow intent, then asynchronously triggers notifications, fraud review, logistics options, analytics, and recommendation suppression.
- Payment capture synchronously routes through payment orchestration and ledger posting, then asynchronously triggers seller messaging, risk monitoring, fulfillment, receipts, and revenue reporting.

## 3. Event-driven architecture

### 3.0 Event taxonomy and ownership

Every durable business fact is emitted as a versioned event by the service that owns the source-of-truth state. Consumers may build projections, but may not treat projections as authoritative for financial, trust, or compliance decisions.

| Event family | Example topics | Primary consumers |
| --- | --- | --- |
| Identity and trust | `identity.user.created`, `trust.verification.completed`, `device.registered` | Fraud, personalization, support, compliance. |
| Catalog | `listing.created`, `listing.updated`, `listing.published`, `listing.removed`, `media.processed` | Search, recommendations, safety, analytics, notifications. |
| Messaging | `message.sent`, `message.delivered`, `message.flagged`, `conversation.created` | Realtime delivery, moderation, fraud, notifications, AI assistants. |
| Commerce | `offer.created`, `order.created`, `order.cancelled`, `fulfillment.confirmed` | Escrow, fraud, seller tools, buyer tools, analytics. |
| Financial | `payment.authorized`, `escrow.funded`, `ledger.posted`, `payout.scheduled`, `refund.completed` | Reconciliation, risk, compliance, support, reporting. |
| Risk and compliance | `risk.decision.created`, `case.opened`, `hold.applied`, `hold.released` | Product services, support, audit, human review. |
| AI | `agent.task.started`, `agent.tool.called`, `agent.task.completed`, `model.evaluation.completed` | AI observability, safety, billing, quality analytics. |

### 3.1 Event backbone

Use Apache Kafka, Redpanda, Google Pub/Sub, Amazon MSK, or Amazon Kinesis depending on cloud strategy. The reference architecture uses Kafka-compatible streaming with regional clusters and cross-region replication.

Core components:

- **Regional event clusters** for low-latency domain events.
- **Global replication layer** for selected topics and projections.
- **Schema registry** using Avro, Protobuf, or JSON Schema.
- **Event catalog** for discovery, ownership, lineage, retention, and PII classification.
- **Dead-letter topics** for poison messages and replayable failures.
- **Stream processors** using Apache Flink, Kafka Streams, or managed equivalents.
- **Outbox pattern** for exactly-once publication from OLTP services.

### 3.2 Event categories

#### Business domain events

- `UserRegistered`
- `IdentityVerificationCompleted`
- `DeviceRiskSignalObserved`
- `ListingCreated`
- `ListingModerationCompleted`
- `ListingPublished`
- `SearchPerformed`
- `ListingViewed`
- `MessageSent`
- `OfferCreated`
- `OfferAccepted`
- `OrderCreated`
- `PaymentAuthorized`
- `EscrowFunded`
- `FulfillmentStarted`
- `OrderCompleted`
- `EscrowReleased`
- `DisputeOpened`
- `RefundIssued`
- `PayoutCreated`
- `PayoutSettled`

#### Technical events

- `ApiRateLimitExceeded`
- `ServiceSloBurnRateAlerted`
- `FeatureFlagChanged`
- `ModelVersionDeployed`
- `AgentToolCallExecuted`
- `DataQualityCheckFailed`
- `SchemaCompatibilityRejected`

#### Risk events

- `AccountRiskScoreChanged`
- `ListingRiskScoreChanged`
- `PaymentRiskScoreChanged`
- `ConversationSafetyFlagged`
- `FraudRingCandidateDetected`
- `ManualReviewDecisionRecorded`
- `PolicyViolationDetected`

### 3.3 Event design rules

- Events represent facts that happened, not commands.
- Events are immutable and append-only.
- Event names use past tense.
- Each event includes `event_id`, `event_type`, `event_version`, `occurred_at`, `published_at`, `producer`, `trace_id`, `actor`, `subject`, `region`, `tenant`, `privacy_classification`, and `idempotency_key` where applicable.
- PII is minimized in events; sensitive fields use tokenization or references.
- Financial events are reconciled against ledger postings and PSP settlement records.
- Events needed for audit are written to immutable storage with retention locks.

### 3.4 Saga orchestration

Use a workflow engine such as Temporal, Cadence, AWS Step Functions, or Google Workflows for long-running business processes.

Recommended sagas:

- Listing publication saga.
- Offer-to-order saga.
- Payment authorization and escrow funding saga.
- Shipping and delivery saga.
- Dispute and refund saga.
- Seller payout saga.
- KYC/KYB verification saga.
- Fraud manual-review saga.
- AI agent task saga.

Sagas must support retries, compensation, timeout handling, idempotency, auditability, and manual intervention.

## 4. Database architecture

### 4.0 Storage placement matrix

Use separate storage technologies by access pattern and correctness requirements. Do not force all domains into one database topology.

| Workload | Preferred store | Partitioning model | Consistency model |
| --- | --- | --- | --- |
| Identity profile | Distributed SQL or regional PostgreSQL with global directory metadata | User home region and user ID | Strong for account mutations, eventual for public profile projections. |
| Listings and inventory | Regional PostgreSQL plus object storage for media | Marketplace region, category, seller ID | Strong per listing, eventual to search and recommendations. |
| Conversations | Wide-column or sharded PostgreSQL plus Redis/Valkey hot cache | Conversation ID with home-region affinity | Ordered per conversation, eventual cross-device receipts. |
| Orders and escrow | Distributed SQL or tightly controlled regional PostgreSQL | Legal entity, currency, region, order ID | Serializable state transitions. |
| Ledger | Distributed SQL with immutable append-only journal | Legal entity, currency, account ID, transaction ID | Strict double-entry correctness and reconciliation. |
| Fraud features | Online feature store over Redis/Bigtable/DynamoDB plus offline lakehouse | Entity ID, feature namespace | Fresh online reads with point-in-time offline correctness. |
| Search | OpenSearch/Elasticsearch/Vespa indexes | Region, category, geo tile, listing ID | Eventually consistent from events. |
| Vector retrieval | Vespa/OpenSearch vector/Milvus/Weaviate/Pinecone/pgvector | Region, embedding namespace, document ID | Eventually consistent with source document lineage. |
| Analytics | Lakehouse plus warehouse | Region, date, event type, governed domain | Append-only raw data with curated certified models. |

### 4.1 Polyglot persistence model

No single database should serve every workload. Use the following database classes:

- **Distributed SQL** for escrow, ledger, orders, offers, identity state, and other strongly consistent workflows.
- **Relational PostgreSQL-compatible stores** for domain services requiring transactional integrity and rich indexing.
- **Wide-column or key-value stores** for high-throughput timelines, counters, session state, and message delivery metadata.
- **Document stores** for flexible listing drafts, AI-generated metadata, catalog enrichment, and moderation artifacts.
- **Search stores** for full-text, geospatial, faceted, and semantic discovery.
- **Vector databases** for embeddings over listings, conversations, catalog content, images, and policies.
- **Graph databases** for fraud networks, trust relationships, entity resolution, and reputation propagation.
- **Object storage** for media, receipts, evidence, model artifacts, exports, archives, and lakehouse tables.
- **Caches** for hot reads, sessions, rate limits, feature flags, ranking features, and realtime ephemeral state.

### 4.2 Reference database choices

Recommended modern options:

- **Distributed SQL**: Google Cloud Spanner, CockroachDB, YugabyteDB, or Amazon Aurora DSQL where available.
- **Relational OLTP**: PostgreSQL, Amazon Aurora PostgreSQL, AlloyDB, or Cloud SQL.
- **Key-value and cache**: Redis Cluster, Valkey, Amazon DynamoDB, Google Bigtable, or Cassandra-compatible stores.
- **Document**: MongoDB Atlas, Amazon DocumentDB, or PostgreSQL JSONB for bounded flexibility.
- **Search**: OpenSearch, Elasticsearch, Solr, Vespa, or Typesense for specific tiers.
- **Vector**: pgvector, OpenSearch vector search, Elasticsearch vector search, Pinecone, Weaviate, Milvus, or Vespa.
- **Graph**: Neo4j, TigerGraph, Amazon Neptune, or graph projections in Spark/Flink for large-scale analytics.
- **Lakehouse**: Apache Iceberg, Delta Lake, or Apache Hudi on object storage.
- **Warehouse**: BigQuery, Snowflake, Databricks SQL, or Amazon Redshift.

### 4.3 Data ownership by service

Each service owns its operational datastore. Other services consume data through APIs, events, or governed read models.

Examples:

- Identity service owns users, credentials, sessions, account status, and recovery state.
- Listing service owns listing lifecycle state and canonical listing attributes.
- Order service owns order lifecycle and contract terms.
- Escrow service owns escrow contract state.
- Ledger service owns immutable ledger entries and account balances.
- Message service owns message bodies, attachments, and delivery state.
- Search service owns denormalized searchable projections.
- Fraud service owns risk scores, risk features, decisions, and risk explanations.

### 4.4 Financial database model

Financial services require stricter controls:

- Use a double-entry ledger with append-only journal entries.
- Maintain immutable accounting events with traceability to business events.
- Every money movement maps to debits and credits.
- Ledger writes must be idempotent and atomic.
- Balances are derived from ledger entries and cached only as projections.
- Reconciliation compares PSP transactions, bank settlement files, ledger entries, fee records, taxes, chargebacks, and payouts.
- Use separate accounts for user cash, escrow liabilities, platform revenue, taxes payable, payment processing fees, reserves, refunds payable, and chargeback liabilities.

### 4.5 Partitioning and sharding

Partition by:

- User home region.
- Marketplace geography.
- Tenant or business account for enterprise sellers.
- Conversation ID for messaging.
- Listing ID for listing lifecycle.
- Order ID for order lifecycle.
- Ledger account ID for financial entries.
- Time for append-heavy event, analytics, and audit tables.

Avoid cross-shard transactions except in explicitly modeled sagas. Use globally unique IDs such as UUIDv7 or Snowflake-style IDs with embedded time and region metadata.

### 4.6 Backup and disaster recovery

Minimum targets:

- Payments, ledger, escrow: RPO near zero, RTO under 30 minutes for regional failover.
- Identity and account access: RPO under 5 minutes, RTO under 30 minutes.
- Messaging: RPO under 5 minutes for persisted messages, RTO under 1 hour.
- Search and recommendations: Rebuildable from source events, RPO under 1 hour, RTO under 4 hours.
- Analytics: RPO under 24 hours for non-critical datasets.

Use continuous backups, point-in-time recovery, cross-region replication, quarterly restore drills, game days, and runbook automation.

## 5. Search architecture

### 5.1 Search capabilities

Marketplace search must support:

- Full-text search.
- Faceted filtering.
- Geospatial radius and travel-time search.
- Category-aware ranking.
- Semantic natural-language search.
- Image-to-listing and listing-to-listing similarity.
- Personalized ranking.
- Safety-aware ranking.
- Availability and inventory-aware ranking.
- Sponsored listings with relevance constraints.
- Query understanding across languages.

### 5.2 Search pipeline

```text
ListingCreated / ListingUpdated events
  → enrichment pipeline
  → moderation and policy labels
  → catalog normalization
  → image and text embeddings
  → pricing and demand features
  → fraud and trust features
  → search document generation
  → index writer
  → regional search cluster
```

Search serving path:

```text
User query
  → query understanding
  → language detection and translation if needed
  → intent classification
  → lexical retrieval
  → semantic retrieval
  → geospatial filtering
  → business-rule filtering
  → candidate blending
  → ranking model
  → diversification
  → fraud and safety suppression
  → ads insertion
  → response personalization
```

### 5.3 Search technology recommendation

Use a two-tier search strategy:

- **Primary marketplace search**: OpenSearch, Elasticsearch, or Vespa for full-text, facets, geospatial filters, vector retrieval, and custom ranking.
- **High-scale personalized ranking**: A dedicated ranking service using feature stores, model serving, and approximate nearest neighbor candidate generation.

For the highest scale and most advanced ranking, Vespa is compelling because it can combine text retrieval, vector search, structured filtering, and model-based ranking in one serving system. OpenSearch or Elasticsearch are excellent choices for operational maturity and broad ecosystem support.

### 5.4 Ranking signals

Ranking should combine:

- Query-listing textual relevance.
- Semantic similarity.
- Distance, pickup convenience, and shipping availability.
- Price competitiveness.
- Listing quality and media quality.
- Seller trust and completion probability.
- Buyer preference history.
- Fraud and policy risk.
- Freshness.
- Demand and scarcity.
- Category-specific quality signals.
- Conversion and satisfaction predictions.
- Diversity and marketplace fairness constraints.

### 5.5 Search freshness

Targets:

- Listing publish to searchable: p50 under 5 seconds, p95 under 30 seconds.
- Listing sold to removed/suppressed: p50 under 2 seconds, p95 under 10 seconds.
- Price update to search update: p95 under 30 seconds.
- Fraud suppression to search removal: p95 under 5 seconds.

## 6. AI architecture

### 6.1 AI use cases

User-facing AI:

- Conversational buying assistant.
- Seller listing agent.
- Price recommendation and negotiation assistant.
- Buyer agent that monitors intent and negotiates within constraints.
- Safety assistant that warns about risky interactions.
- Support and dispute assistant.
- Multilingual chat translation and summarization.
- Visual listing creation from images and video.

Internal AI:

- Fraud analyst copilot.
- Trust and safety moderation copilot.
- Support agent copilot.
- Dispute resolution recommendation assistant.
- Catalog enrichment and product matching.
- Search query understanding.
- Review and feedback summarization.
- Compliance investigation summarization.

### 6.2 AI platform components

```text
AI clients and services
  → AI gateway
  → policy and safety layer
  → model router
  → prompt/template registry
  → retrieval layer
  → tool execution layer
  → agent runtime
  → evaluation and observability layer
  → human escalation layer
```

Key components:

- **AI gateway**: Central access point for OpenAI, Anthropic, Google Gemini, open-source models, embedding models, speech models, vision models, moderation models, and internally fine-tuned models.
- **Model router**: Selects models by latency, cost, data sensitivity, modality, quality, region, and fallback policy.
- **Agent runtime**: Executes durable workflows with memory, plans, tools, approval steps, budgets, deadlines, and cancellation.
- **Tool registry**: Defines safe actions agents can perform, such as creating drafts, sending offers, summarizing conversations, creating shipping labels, or escalating cases.
- **RAG layer**: Retrieves policy, product, catalog, transaction, listing, user, and help-center context with permission-aware filtering.
- **Memory service**: Stores user-approved preferences, seller constraints, buyer intents, negotiation boundaries, and task history.
- **Evaluation service**: Runs golden-set tests, adversarial tests, regression tests, online quality measurement, and safety checks.
- **Guardrail service**: Enforces tool permissions, policy restrictions, PII handling, marketplace safety rules, and payment action approvals.

### 6.3 Agent operating model

Agents must be constrained and auditable.

Agent permissions:

- **Read-only agent**: Can search, summarize, recommend, and explain.
- **Drafting agent**: Can create drafts but requires user approval before publishing.
- **Negotiation agent**: Can negotiate within explicit price, timing, location, and counterparty constraints.
- **Transaction agent**: Can prepare payment, escrow, logistics, or dispute actions but requires step-up authentication or explicit confirmation.
- **Internal operations agent**: Can recommend actions to human reviewers; high-impact actions require human approval.

Agent safety controls:

- Tool allowlists by agent type.
- Per-user and per-task budgets.
- Human confirmation for financial or irreversible actions.
- Policy checks before every tool call.
- Full audit trails for prompts, retrieved context references, tool calls, outputs, and user approvals.
- PII redaction where not required for model quality.
- Model output validation against typed schemas.
- Automated jailbreak, prompt-injection, and data-exfiltration defenses.

### 6.4 Model strategy

Use a portfolio approach:

- Frontier multimodal LLMs for complex reasoning, support, disputes, safety review, and high-value agent tasks.
- Smaller low-latency LLMs for message drafting, summarization, translation, query rewriting, and classification.
- Embedding models for semantic search, recommendations, duplicate detection, and RAG.
- Vision models for item recognition, condition detection, prohibited content, counterfeit signals, and listing quality checks.
- Gradient-boosted trees and deep ranking models for fraud, ranking, pricing, and conversion prediction.
- Graph ML for fraud rings, collusion, mule networks, and trust propagation.

### 6.5 AI data governance

- Classify data used in prompts and retrieval.
- Enforce region-specific model routing for data residency.
- Avoid sending regulated financial and identity data to external models unless contracts, controls, and approvals permit it.
- Keep encrypted prompt and output logs with retention policies and redaction.
- Maintain user consent for personalization memory.
- Provide opt-outs where required.
- Run model cards, risk assessments, eval reports, and release approvals for material model changes.

## 7. Realtime architecture

### 7.1 Realtime requirements

The realtime layer supports:

- User-to-user messaging.
- Typing indicators.
- Presence.
- Read receipts.
- Offer updates.
- Order status updates.
- Payment and escrow status updates.
- AI assistant streaming responses.
- Live support escalation.
- Moderation interventions.
- Push notifications for offline users.

### 7.2 Connection architecture

```text
Client
  → global edge
  → regional realtime gateway
  → connection manager
  → auth/session validator
  → pub/sub fanout
  → conversation/message services
  → persistence and event stream
```

Use:

- WebSockets for broad client compatibility.
- WebTransport where supported for improved performance.
- MQTT for constrained devices or partner integrations if needed.
- Push notification services for offline delivery.

### 7.3 Messaging persistence model

Messages should be persisted before acknowledged to the sender.

Flow:

1. Client sends message with idempotency key.
2. Realtime gateway validates session and rate limits.
3. Message service validates conversation membership, block state, policy, and risk controls.
4. Message is persisted in a durable message store.
5. Message event is published to the event backbone.
6. Fanout service delivers to online recipients.
7. Notification service sends push/email/SMS if offline or delayed.
8. Moderation and fraud processors asynchronously scan content and can redact, warn, limit, or escalate.

### 7.4 Realtime storage

- Persisted messages: Cassandra-compatible store, DynamoDB, Bigtable, or sharded PostgreSQL depending on scale and consistency needs.
- Conversation metadata: PostgreSQL or distributed SQL.
- Presence and typing: Redis/Valkey with short TTLs.
- Fanout queues: Kafka, Redis Streams, NATS JetStream, or managed pub/sub.
- Attachments: Object storage with signed URLs, malware scanning, and media moderation.

### 7.5 Safety in messaging

- Detect off-platform payment requests, phishing, harassment, prohibited goods, and personal data abuse.
- Apply risk-based friction such as warnings, link blocking, attachment scanning, delayed delivery, or human review.
- Prevent sending contact details before trust thresholds where product policy requires it.
- Use conversation-level risk scoring before escrow funding, payment release, or pickup meetup.
- Support user blocking, reporting, muting, and safety check-ins.

## 8. Security architecture

### 8.1 Zero-trust controls

- Workload identity for every service.
- Mutual TLS between services.
- Short-lived service credentials.
- Fine-grained authorization using RBAC and ABAC.
- Policy-as-code for infrastructure, service access, data access, and administrative actions.
- Central secrets management with automatic rotation.
- Strong administrative authentication with hardware-backed MFA.
- Just-in-time privileged access.
- Immutable audit logs for privileged operations.

### 8.2 User security

- Passkeys and WebAuthn as first-class authentication.
- OAuth and social login where appropriate.
- Risk-based step-up authentication.
- Device binding for sensitive actions.
- Account recovery with fraud-resistant checks.
- Session anomaly detection.
- Login notifications and security center.
- Granular privacy controls and consent management.

### 8.3 Payment and escrow security

- PCI DSS scoped architecture using tokenized payment methods and PSP-hosted collection where possible.
- Strict separation between marketplace services and cardholder data environment.
- HSM or cloud KMS-backed encryption for sensitive payment and ledger secrets.
- Idempotency for all money movement APIs.
- Dual control for manual financial adjustments.
- Strong reconciliation and exception workflows.
- Sanctions, AML, and transaction monitoring controls.
- Payout holds and reserves for high-risk sellers.

### 8.4 Application security

- Secure SDLC with threat modeling for critical domains.
- SAST, DAST, dependency scanning, container scanning, IaC scanning, and secret scanning in CI.
- Runtime threat detection.
- API gateway schema validation.
- Rate limits and abuse throttles.
- Bot detection and proof-of-work or challenge flows for abusive traffic.
- Content security policy for web clients.
- Mobile app attestation and certificate pinning where appropriate.

### 8.5 Data security

- Encryption in transit and at rest.
- Field-level encryption for high-sensitivity identity, payment, tax, and dispute data.
- Tokenization for PII references in event streams.
- Data access through governed services, not direct database reads.
- Attribute-based data access controls.
- Data loss prevention on exports.
- Regional data residency controls.
- Retention and deletion automation.

### 8.6 Compliance posture

Relevant compliance programs and regulations may include:

- PCI DSS for payment processing scope.
- SOC 2 Type II for trust controls.
- ISO 27001 for information security management.
- GDPR and UK GDPR for European users.
- CCPA/CPRA for California users.
- PSD2/SCA for European payment flows.
- AML and sanctions compliance depending on escrow and wallet structure.
- Marketplace facilitator tax rules.
- DAC7, 1099-K, or local seller reporting regimes where applicable.

## 9. Data architecture

### 9.1 Data platform goals

The data platform powers analytics, AI, fraud detection, recommendations, financial reporting, experimentation, operations, compliance, and product insights.

Requirements:

- Near-real-time event ingestion.
- Batch processing for large-scale historical features.
- Streaming features for fraud and ranking.
- Governed lakehouse with fine-grained access control.
- High-quality entity resolution across users, devices, payment methods, listings, addresses, and counterparties.
- Privacy-preserving analytics and compliant retention.
- Data lineage and cataloging.

### 9.2 Data flow

```text
Operational services
  → transactional outbox
  → regional event streams
  → stream processing
  → feature store / realtime serving stores
  → lakehouse bronze tables
  → cleaned silver tables
  → curated gold data products
  → warehouse, dashboards, ML training, finance reports, compliance reports
```

### 9.3 Lakehouse architecture

Use object storage with Apache Iceberg, Delta Lake, or Hudi tables.

Layers:

- **Bronze**: Raw append-only events and operational CDC snapshots.
- **Silver**: Cleaned, deduplicated, schema-normalized, privacy-classified datasets.
- **Gold**: Curated data products for finance, growth, fraud, search, ranking, support, marketplace health, and executive reporting.

Core tools:

- Ingestion: Kafka Connect, Flink, Debezium, Pub/Sub Dataflow, or managed equivalents.
- Processing: Spark, Flink, Beam, dbt, Databricks, or Dataflow.
- Catalog: DataHub, OpenMetadata, Glue Data Catalog, Unity Catalog, or BigQuery Data Catalog.
- Quality: Great Expectations, Soda, Deequ, or custom data contracts.
- Orchestration: Airflow, Dagster, Prefect, or managed workflows.

### 9.4 Feature platform

Use a feature store such as Feast, Tecton, Vertex AI Feature Store, SageMaker Feature Store, or a custom platform over Redis/Bigtable and lakehouse tables.

Feature classes:

- User trust features.
- Seller reliability features.
- Buyer intent features.
- Listing quality features.
- Message risk features.
- Payment risk features.
- Device and network features.
- Geospatial liquidity features.
- Search and ranking features.
- Pricing and demand features.

Feature requirements:

- Training-serving consistency.
- Point-in-time correctness.
- Low-latency online access.
- Offline historical access.
- Feature ownership and documentation.
- Feature freshness SLOs.
- Access controls for sensitive features.

### 9.5 Analytics and metrics

North-star and platform metrics:

- Successful protected transaction volume.
- Gross merchandise value.
- Search-to-contact conversion.
- Contact-to-offer conversion.
- Offer-to-order conversion.
- Order completion rate.
- Fraud loss rate.
- Chargeback rate.
- Dispute rate.
- Seller sell-through time.
- Buyer satisfaction.
- Message response time.
- Escrow release latency.
- Payout latency.
- AI task success rate.
- AI cost per successful transaction.
- Search relevance and zero-result rate.
- Marketplace liquidity by geography and category.

### 9.6 Privacy-preserving data practices

- Apply data minimization to events.
- Tokenize identifiers where raw identifiers are unnecessary.
- Use differential privacy or aggregation thresholds for sensitive analytics where appropriate.
- Enforce purpose-based access controls.
- Maintain retention policies per dataset.
- Automate deletion, export, correction, and restriction workflows.
- Separate production access from analytics access.
- Use clean rooms for partner collaboration where needed.

## 10. Deployment architecture

### 10.1 Runtime platform

Reference runtime:

- Kubernetes for service workloads.
- Service mesh using Istio, Linkerd, or managed mesh.
- Envoy-based API gateway.
- Container registry with signed images.
- Helm, Kustomize, or platform-native deployment packages.
- Argo CD, Flux, Spinnaker, or cloud deploy tooling for GitOps and progressive delivery.
- Terraform, OpenTofu, Pulumi, or Crossplane for infrastructure as code.
- OpenTelemetry for traces, metrics, and logs.
- Prometheus-compatible metrics and long-term metrics storage.
- Centralized logs in OpenSearch, Loki, Splunk, or cloud logging.
- Incident management through PagerDuty, Opsgenie, or equivalent.

### 10.2 Environment strategy

- **Developer environments**: Ephemeral preview environments per pull request.
- **Shared integration**: Contract testing, schema compatibility, and cross-service integration.
- **Staging**: Production-like regional cells with synthetic traffic.
- **Canary production**: Small traffic percentages in one or more low-risk cells.
- **Production**: Multi-region active-active cells.
- **Disaster recovery**: Regularly exercised standby and active recovery regions.

### 10.3 Release strategy

- Trunk-based development with short-lived branches.
- Feature flags for incomplete or risky functionality.
- Progressive delivery with canaries and automatic rollback.
- Blue/green deployment for critical services.
- Database migrations with expand-contract patterns.
- Backward-compatible API and event changes.
- Model deployments through shadow, canary, and holdout phases.
- Separate release gates for financial, security, and AI safety-sensitive systems.

### 10.4 Multi-region strategy

Use active-active for stateless and eventually consistent systems. Use active-active or leader-per-partition for stateful systems depending on consistency requirements.

Patterns:

- **Stateless services**: Active-active in every cell.
- **Search indexes**: Regional indexes rebuilt from regional events and replicated global catalog events.
- **Messaging**: Conversation affinity to a home region with cross-region delivery for travelers and counterparties.
- **Payments and escrow**: Regionally anchored, strongly consistent, and failover to approved recovery region.
- **Ledger**: Strong consistency within legal entity and currency boundary; cross-region replication for audit and DR.
- **AI inference**: Regional inference where possible, centralized fallback for expensive frontier models.
- **Data platform**: Regional raw storage plus governed global analytics aggregates where legally permitted.

### 10.5 Observability and reliability

Define SLOs by user journey:

- Search availability and latency.
- Listing creation latency.
- Message send latency.
- Payment authorization success and latency.
- Escrow funding correctness.
- Order creation availability.
- AI assistant response latency and success.
- Fraud decision latency.
- Payout settlement latency.

Use:

- Distributed tracing with trace IDs propagated through APIs, events, workflows, and AI tool calls.
- RED metrics for services: rate, errors, duration.
- USE metrics for infrastructure: utilization, saturation, errors.
- Business process monitors for orders, escrow, payouts, disputes, and support queues.
- Synthetic probes from every major geography.
- Burn-rate alerts instead of static threshold-only alerts.
- Chaos testing for regional failover, dependency failure, message backlog, and payment partner outage scenarios.

## Cross-cutting architecture details

### Fraud detection architecture

Fraud detection must be embedded into every critical journey.

#### Real-time decision points

- Signup and login.
- Device registration.
- Listing creation.
- Listing publish.
- First message.
- Suspicious keyword or link in messaging.
- Offer creation.
- Payment authorization.
- Escrow funding.
- Pickup or shipment confirmation.
- Escrow release.
- Refund request.
- Payout creation.
- Account recovery.
- Profile, bank account, or payment method changes.

#### Fraud platform flow

```text
Business action
  → risk event creation
  → feature hydration
  → rules evaluation
  → ML risk scoring
  → graph risk lookup
  → policy decision
  → action: allow, warn, step-up, hold, limit, review, block
  → case management and feedback loop
```

#### Fraud models

- Account takeover model.
- Fake listing model.
- Counterfeit risk model.
- Scam conversation model.
- Payment fraud model.
- Chargeback risk model.
- Payout risk model.
- Seller collusion model.
- Buyer abuse model.
- Dispute abuse model.
- Synthetic identity model.
- Mule account model.

### Escrow payments architecture

Escrow should be modeled as a regulated financial workflow, not just a payment status.

Core states:

```text
Created
  → AwaitingPaymentAuthorization
  → PaymentAuthorized
  → EscrowFunded
  → FulfillmentInProgress
  → ReleaseEligible
  → Released
  → PayoutScheduled
  → PayoutSettled
```

Exceptional states:

```text
AuthorizationFailed
PaymentExpired
EscrowHold
DisputeHold
RefundPending
Refunded
ChargebackOpen
ChargebackResolved
ComplianceHold
Cancelled
```

Controls:

- Explicit escrow contract terms at checkout.
- Clear buyer and seller release conditions.
- Configurable hold periods by risk, category, and geography.
- Partial release and partial refund support.
- Dispute hold automation.
- Ledger-backed state transitions.
- Idempotent PSP interactions.
- Immutable audit trail.
- Regulatory reporting and reconciliation.

### Global scaling architecture

Scale through cells, partitioning, asynchronous processing, and workload isolation.

Workload isolation:

- Separate clusters for external APIs, internal APIs, realtime gateways, stream processing, AI inference, data processing, and administrative tooling.
- Separate node pools for latency-sensitive, GPU, memory-heavy, burst, and batch workloads.
- Dedicated financial services clusters or namespaces with stricter controls.
- Dedicated risk and moderation pipelines to avoid marketplace load starving safety work.

Capacity levers:

- Cache hot read paths at edge and regional caches.
- Precompute recommendations and ranking candidates.
- Use asynchronous projections for expensive joins.
- Use backpressure and queue-based load leveling.
- Use adaptive rate limits by user, device, IP, geography, endpoint, and risk score.
- Autoscale by CPU, memory, request rate, queue depth, Kafka lag, GPU utilization, and custom business metrics.

### Recommended technology stack

#### Client and edge

- Web: React, Next.js, TypeScript.
- Mobile: Swift, Kotlin, or React Native for selected shared surfaces.
- CDN and edge: Cloudflare, Fastly, Akamai, AWS CloudFront, or Google Cloud CDN.
- API gateway: Envoy, Kong, Apigee, Amazon API Gateway, or Google Cloud API Gateway.
- Realtime edge: Envoy, NGINX, custom Go/Rust gateway, or managed WebSocket infrastructure.

#### Backend

- Service languages: Go, Java/Kotlin, Rust for high-performance infrastructure, Python for ML/data services, TypeScript for BFFs where appropriate.
- Internal APIs: gRPC and Protobuf.
- External APIs: REST and GraphQL.
- Workflow: Temporal.
- Events: Kafka-compatible streaming or managed cloud pub/sub.
- Cache: Redis or Valkey.
- Search: OpenSearch, Elasticsearch, or Vespa.
- Vector: pgvector, OpenSearch vector, Vespa, Pinecone, Weaviate, or Milvus.
- Graph: Neo4j, TigerGraph, Neptune, or Spark/Flink graph processing.

#### Payments

- PSPs: Stripe, Adyen, Checkout.com, Braintree, or regional payment processors.
- Escrow: Dedicated escrow service with regulated partner integration where required.
- Ledger: Custom double-entry ledger on distributed SQL, or a mature ledger platform if it satisfies scale, audit, and regulatory requirements.
- Reconciliation: Stream and batch reconciliation against PSP and bank reports.

#### AI and ML

- LLM providers: OpenAI, Anthropic, Google Gemini, or approved regional providers.
- Open-source inference: vLLM, TensorRT-LLM, Ray Serve, KServe, or Triton Inference Server.
- ML platform: Vertex AI, SageMaker, Databricks, Kubeflow, or custom Kubernetes ML platform.
- Feature store: Tecton, Feast, Vertex AI Feature Store, SageMaker Feature Store, or custom.
- Experiment tracking and registry: MLflow, Weights & Biases, Vertex AI Model Registry, or SageMaker Model Registry.
- Evaluation: custom eval harness, OpenTelemetry tracing, and offline/online eval dashboards.

#### Data

- Lakehouse: Iceberg, Delta Lake, or Hudi.
- Warehouse: BigQuery, Snowflake, Databricks SQL, or Redshift.
- Stream processing: Flink, Beam, Spark Structured Streaming, Kafka Streams.
- Orchestration: Airflow, Dagster, or Prefect.
- Data catalog: DataHub, OpenMetadata, Unity Catalog, or cloud-native catalog.
- Quality: Great Expectations, Soda, Deequ, or dbt tests.

#### Platform engineering

- Kubernetes.
- Istio or Linkerd service mesh.
- Argo CD or Flux for GitOps.
- Terraform, OpenTofu, Pulumi, or Crossplane.
- OpenTelemetry.
- Prometheus, Grafana, Loki, Tempo, OpenSearch, Datadog, New Relic, Honeycomb, or cloud observability suites.
- Vault, cloud KMS, cloud secret managers, and HSMs for regulated workloads.

## Implementation roadmap

### Phase 1: Foundation and MVP marketplace

- Build identity, listing, search, messaging, order, payment orchestration, and basic fraud services.
- Launch one primary region and one disaster recovery region.
- Use managed PostgreSQL, OpenSearch, Redis, object storage, Kafka-compatible streaming, and a PSP integration.
- Add AI listing generation, basic AI search query understanding, and support copilot.
- Establish observability, CI/CD, IaC, and security baseline.

### Phase 2: Protected transactions and trust

- Add escrow, double-entry ledger, dispute service, payout service, and reconciliation.
- Add KYC/KYB, sanctions screening, transaction monitoring, and manual risk review.
- Add reputation graph and device intelligence.
- Expand to multiple regional cells.
- Add advanced message safety and fraud ML models.

### Phase 3: AI-native marketplace

- Add buyer and seller agents with constrained tool execution.
- Add visual listing creation, dynamic pricing, negotiation assistance, and multilingual commerce.
- Add vector search and semantic recommendations.
- Build AI evaluation platform and model governance.
- Add agent memory with user consent and policy-based controls.

### Phase 4: Global scale and ecosystem

- Expand active-active regional cells.
- Add partner APIs, merchant tools, logistics marketplace, insurance/warranty integrations, and developer webhooks.
- Add global data products, clean rooms, and advanced experimentation.
- Optimize search/ranking with real-time features and category-specific models.
- Build mature fraud graph, graph ML, and cross-region risk intelligence.

### Phase 5: Marketplace operating system

- Expose trusted identity, payments, escrow, logistics, AI agents, search, and fraud capabilities as platform APIs.
- Support third-party storefronts and embedded commerce.
- Add enterprise-grade governance, SLAs, tenant isolation, and extensibility.
- Build category-specific vertical experiences and local commerce graph products.

## Key architectural tradeoffs

### Microservices versus modular monolith

A platform targeting 100 million users and regulated payment workflows eventually requires domain-owned services. However, early development should avoid excessive fragmentation. Start with a modular monolith or small set of services for marketplace basics, then split services by data ownership, scaling needs, regulatory boundary, and team ownership.

### Distributed SQL versus regional PostgreSQL

Distributed SQL is valuable for ledger, escrow, orders, and identity where consistency and regional resilience matter. Regional PostgreSQL remains excellent for many domain services. Use distributed SQL selectively instead of forcing every workload onto it.

### Search engine versus database search

Operational databases should not serve high-scale marketplace search. Use a dedicated search system with asynchronous indexing. Keep source-of-truth listing state in the listing service database.

### Build versus buy for payments

Use established PSPs and regulated escrow partners where possible, but own the payment orchestration, ledger, risk decisioning, reconciliation, and user-facing money movement model. This preserves flexibility and auditability while reducing regulatory and card-network burden.

### External LLMs versus self-hosted models

Use external frontier models for high-quality complex reasoning and multimodal workflows. Use self-hosted or smaller managed models for high-volume, low-latency, privacy-sensitive, or cost-sensitive tasks. Route dynamically based on quality, cost, region, and data classification.

## Critical success factors

1. Keep financial state exact, auditable, and reconciled.
2. Keep search fresh, relevant, safe, and personalized.
3. Keep messaging fast, reliable, and protected from abuse.
4. Keep AI agents constrained, evaluated, auditable, and user-controlled.
5. Keep fraud controls embedded into every critical journey.
6. Keep regional cells isolated enough to survive failures but connected enough to power global liquidity.
7. Keep data governance strong enough to enable AI without compromising privacy or compliance.
8. Keep platform patterns simple enough for hundreds of engineers to use consistently.
