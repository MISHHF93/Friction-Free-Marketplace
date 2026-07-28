# Production readiness scorecard

**Assessment date:** 2026-07-28
**Overall score:** 85/100
**Decision:** Conditional — the repository is deployable by design and is a strong release-candidate foundation. Public production and store promotion still require clean CI, signed artifacts, configured providers, and real-device evidence.

This score measures demonstrated release readiness, not file count or planned features. A configured workflow receives partial credit until it produces a passing artifact in its target environment.

## Weighted assessment

| Area | Weight | Score | Evidence and remaining work |
| --- | ---: | ---: | --- |
| Web deployment and PWA | 15 | 14 | Next.js standalone output, Vercel/container workflows, health routes, manifest, icons, install metadata, offline support, conservative service worker, and a successful production build are present. Production-origin proof remains. |
| Backend and data | 15 | 12 | Ordered Supabase migrations, RLS-oriented schema, signed uploads, health checks, and a fresh-database CI job exist. A passing clean-runner reset remains required. |
| Security, privacy, and compliance | 15 | 15 | Server-only environment validation, browser/server schema isolation, security headers, centralized same-origin enforcement for browser API mutations, narrowly exempted signed worker/webhook routes, authenticated uploads, account deletion, artifact scans, and server-derived AI authorization context are implemented. |
| Android | 12 | 9 | Capacitor project, package ID, verified links, navigation/network/share/camera behavior, permissions, assets, versioning, bundle workflow, and signing placeholders exist. A signed AAB and physical-device proof remain. |
| iOS | 12 | 9 | Capacitor project, bundle ID, associated domains, safe areas, privacy manifest, permission text, native behavior, archive workflow, and TestFlight path exist. A signed archive and physical-device proof remain. |
| CI/CD and portability | 12 | 10 | Locked installs and web, browser, database, container, Android, and iOS jobs exist alongside Vercel, GHCR, Play, and TestFlight release workflows. The complete matrix must pass in GitHub. |
| Marketplace intelligence and integrations | 10 | 9 | Supabase, Stripe, Resend, Meilisearch, OpenAI, and PostHog interfaces exist. Search classifies intent locally and optional-provider failures degrade truthfully without substituting demo inventory in production. Live providers remain unverified. |
| Tests and operational quality | 9 | 7 | Platform verification, encoding checks, typecheck, lint, production builds, unit/E2E coverage, Lighthouse, smoke tooling, and release evidence templates exist. Local Vitest is blocked by Windows policy; clean CI and device results remain required. |
| **Total** | **100** | **85** | **Strong conditional candidate; not release-approved yet.** |

## Why the score increased

The score moved from **78 to 82** based on implemented and locally evidenced improvements:

- A single-repository contract verifies web, Android, and iOS projects and their shared identity.
- Production Next.js and mobile TypeScript builds pass.
- AI request context is sanitized and authorization-relevant identity is derived server-side.
- Natural-language search works deterministically without OpenAI; an available model can refine language but cannot invent trusted filters.
- Classification covers category confidence and evidence, budget, condition, fulfillment, seller trust, and safety signals.
- International formatting and bidirectional-layout foundations are represented and tested.

No credit was awarded for unsigned native artifacts, unconfigured production providers, or unproven real-device journeys.

## Latest reliability implementation

- The header now exposes one Categories control and one Ask AI launcher at each responsive breakpoint; the misleading search-field AI badge was removed.
- Expensive AI routes use a hashed, atomic Supabase rate limiter shared across replicas and fail closed when the limiter is unavailable.
- Readiness reports sanitized required and optional component states with bounded provider checks and a release identifier.
- Public and server environment schemas are separated; the browser artifact scan confirms server-secret identifiers are absent from static chunks.
- Dependency policy, migration verification, artifact scans, immutable container tags, hosted-backend prerequisites for mobile packaging, and rollback procedures are release gates.
- Local platform, encoding, migration, typecheck, lint, production web build, mobile build, dependency-policy, and browser-static secret checks pass.

The score is now **85** based on locally demonstrated centralized mutation protection, security-boundary, and truthful-degradation controls. GitHub, deployment, signed-store, and physical-device points remain unawarded.

## Confirmed implementation

- Web targets Vercel or a compatible container host. GitHub Pages is intentionally unsupported because the application requires server routes.
- Android and iOS reuse the hosted HTTPS product through Capacitor and add native links, navigation, connectivity recovery, camera/photo access, sharing, safe areas, and secure external browsing.
- Physical-goods payments remain on Stripe; server secrets are not embedded in native packages.
- CI covers lint, typecheck, unit tests, browser E2E, Lighthouse/accessibility, web build, container health, fresh Supabase migration, native builds, and client secret scanning.
- Release workflows cover Vercel, GHCR, Play internal testing, and TestFlight with encrypted credentials.
- Ordinary search and Ask AI share a deterministic classifier, keeping discovery useful when OpenAI or Meilisearch is unavailable.

## Path to 90+

| Proof delivered | Points | Target |
| --- | ---: | ---: |
| Clean GitHub CI matrix and fresh database reset | +1 | 86 |
| Healthy HTTPS deployment with DNS, redirects, webhooks, email, search, monitoring, and rollback verified | +2 | 88 |
| Signed AAB in Play internal testing with physical Android journey evidence | +2 | 90 |
| Signed TestFlight build with physical iOS journey evidence | +2 | 92 |
| Complete transaction, accessibility, offline, deep-link, deletion, and AI-quality evidence across platforms | +2 | 94 |

Scores above 94 are reserved for observed production reliability, store approval, crash-free sessions, performance budgets, incident readiness, and measured user outcomes. Source code alone cannot earn those points.

## Release blockers

- [ ] Complete GitHub Actions CI passes from a clean checkout with `npm ci`.
- [ ] `supabase db reset` succeeds and the production migration is applied.
- [ ] Production dependency findings have no unaccepted high/critical risks; exceptions have an owner and expiry.
- [ ] Production `/api/health` and `/api/health/ready` checks pass over HTTPS.
- [ ] Association endpoints use the real Apple team ID and Play signing fingerprints.
- [ ] Supabase redirects, Stripe webhooks/Connect, Meilisearch, Resend, OpenAI, DNS, TLS, monitoring, and rollback are configured and tested.
- [ ] Signed Android and iOS builds reach internal testing and pass physical-device buyer and seller journeys.
- [ ] Auth, photo listing, search, messaging, favorites, checkout, onboarding, sharing, deep links, offline recovery, and account deletion pass across all target platforms.
- [ ] Browser, AAB, and IPA artifacts pass server-secret scans.
- [ ] Store privacy declarations, support details, screenshots, descriptions, ratings, and reviewer accounts are finalized.

## Reproducible checks

```bash
npm ci
npm run release:check
npm audit --omit=dev
```

Infrastructure and native checks run through `.github/workflows/ci.yml`. Record release proof using `docs/release-evidence-template.md`.

## Score policy

- **90–100:** release candidate or measured production maturity.
- **75–89:** conditional; implementation is strong but release evidence is incomplete.
- **50–74:** major readiness gaps.
- **Below 50:** not deployable.

Recalculate only from attached CI, artifact, endpoint, store, and real-device evidence.
