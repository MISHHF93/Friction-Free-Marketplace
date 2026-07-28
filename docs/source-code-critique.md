# Source-code critique and upgrade priorities

**Assessment date:** 2026-07-28  
**Position:** Strong product breadth and deployment scaffolding, but not yet a release-quality operating system without closing the security, scale, testing, and maintainability gaps below.

## Executive criticism

The repository is ambitious and substantially implemented, but breadth is masking uneven depth. Many workflows exist, yet several depend on demonstration fallbacks, local process state, external credentials, or CI evidence that has not been produced. The visual system is increasingly coherent; the engineering system still needs more decomposition, observable failure handling, and proof under real production load.

## Critical findings

### 1. Production dependency risk is controlled pending upstream releases

`npm audit --omit=dev` reports three high-severity findings through Next.js dependencies:

- PostCSS source-map file disclosure/path traversal advisories
- Sharp/libvips inherited image-processing advisories

The audit-proposed downgrade to an old Next.js major is not acceptable. Resolution requires tested upstream-compatible dependency versions or an explicitly documented temporary risk acceptance with compensating controls.

**Status:** controlled. CI now fails on any new, unowned, or expired high/critical finding. The four current upstream advisories have documented applicability, compensating controls, owners, and expirations.

### 2. Distributed rate limiting

The current limiter is process-local. In Vercel, containers, or multiple replicas, each instance owns a separate counter and restarts clear limits. This weakens AI, authentication-adjacent, messaging, upload, and transaction abuse controls.

**Status:** fixed. Expensive AI operations use hashed, atomic Supabase counters across replicas and fail closed when the limiter is unavailable. The memory adapter is restricted to local development and tests.

### 3. AI context previously trusted arbitrary client metadata

The AI request schema allowed a free-form metadata record and the route included it in task/audit summaries. A client could inject irrelevant, sensitive, or misleading fields into model and audit context.

**Status:** fixed in this pass. The server now retains only validated entity IDs, locale, and a same-origin pathname; client-provided role and arbitrary metadata are discarded.

### 4. Test evidence is incomplete

The repository has meaningful unit and Playwright coverage, but local Windows application control blocks Rollup and browser execution. A passing production build is valuable but does not prove payment state transitions, RLS, browser interaction, or native-device behavior.

**Required gate:** publish clean Linux/macOS CI evidence plus Android and iOS real-device smoke results.

## High-priority maintainability findings

### 5. Several modules are too large

Notable examples:

- `components/listings/listing-form.tsx`: approximately 1,200 lines
- `lib/fraud/detection.ts`: approximately 600 lines
- `lib/listings/persistence.ts`: approximately 500 lines
- `components/search/discovery-page.tsx`: approximately 480 lines
- `components/messaging/communication-hub.tsx`: approximately 425 lines
- `app/dashboard/messages/actions.ts`: approximately 425 lines

These files combine state, validation, transport, rendering, and policy. That increases regression risk and discourages focused tests.

**Upgrade:** split by domain behavior, not arbitrary line count—form steps and hooks, fraud signal families, persistence commands, search filter/result modules, and messaging actions.

### 6. Demonstration fallbacks

Public marketplace and search services deliberately fall back to demo data. This is useful locally, but production must never quietly present demonstration inventory when Supabase or Meilisearch is broken.

**Status:** fixed. Placeholder-backed demo data is local-only unless `MARKETPLACE_DEMO_MODE=true` is explicitly set. Production provider failures now return empty/unavailable states and emit sanitized reliability events.

### 7. AI remains read-heavy

The assistant now has grounded, typed evidence cards, but most recommendations still end as text. The proposal-and-confirmation layer for saved searches, owned listing drafts, and unsent message drafts remains unimplemented.

**Upgrade:** introduce idempotent proposal records and narrowly scoped confirmation endpoints before enabling any AI write.

### 8. Observability is configured more than demonstrated

PostHog and audit interfaces exist, but there is no attached evidence of production funnels, alert thresholds, correlation IDs across all critical flows, or tested outage notifications.

**Upgrade:** define typed product events, error monitoring, trace correlation, SLOs, and alert drills.

## UX and product criticism

- The platform exposes many buyer, seller, admin, AI, trust, and finance surfaces; navigation clarity must be validated with real users rather than inferred from route completeness.
- Some public statistics and marketplace data are demonstration-derived. Customer-facing copy must never imply live scale when integrations are not connected.
- The design system now constrains alignment globally, but visual regression screenshots are blocked locally and need authoritative CI baselines.
- AI recommendations need feedback controls, evidence freshness, and explicit degraded-state explanations.

## Recommended execution order

1. Resolve or formally mitigate production dependency advisories.
2. Replace process-local production rate limiting.
3. Disable silent production demo fallbacks.
4. Implement AI proposal/confirmation for low-risk draft actions.
5. Decompose the listing form and messaging hub with characterization tests.
6. Establish CI visual regression, accessibility, and real-device release evidence.
7. Add production observability and conduct failure drills.

## Standard for future upgrades

Every upgrade should include:

- A specific user or operational outcome
- Authorization and data-boundary review
- Loading, empty, degraded, and retry behavior
- Focused automated tests
- Measurable telemetry without private content
- A clean production build and documented release evidence
