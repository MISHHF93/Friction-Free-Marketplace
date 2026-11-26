# Production readiness scorecard

**Assessment date:** 2026-07-28
**Overall score:** 85/100
**Decision:** Conditional — the repository is deployable by design and is a strong release-candidate foundation. Public production still requires clean CI, configured providers, and real mobile-device PWA evidence.

This score measures demonstrated release readiness, not file count or planned features. A configured workflow receives partial credit until it produces a passing artifact in its target environment.

## Weighted assessment

| Area | Weight | Score | Evidence and remaining work |
| --- | ---: | ---: | --- |
| Web deployment and PWA | 15 | 14 | Next.js standalone output, Railway/container workflows, health routes, manifest, icons, install metadata, offline support, conservative service worker, and a successful production build are present. Production-origin proof remains. |
| Backend and data | 15 | 12 | Ordered Supabase migrations, RLS-oriented schema, signed uploads, health checks, and a fresh-database CI job exist. A passing clean-runner reset remains required. |
| Security, privacy, and compliance | 15 | 15 | Server-only environment validation, browser/server schema isolation, security headers, centralized same-origin enforcement for browser API mutations, narrowly exempted signed worker/webhook routes, authenticated uploads, account deletion, artifact scans, and server-derived AI authorization context are implemented. |
| Mobile PWA | 24 | 18 | Installable web manifest, phone-first shell, offline fallback, mobile navigation, and responsive layouts are implemented. Production-origin install and real-device buyer/seller proof remain. |
| CI/CD and portability | 12 | 10 | Locked installs and web, browser, database, and container jobs exist with Railway deployment and immutable GHCR release evidence. The complete matrix must pass in GitHub. |
| Marketplace intelligence and integrations | 10 | 9 | Supabase, Stripe, Resend, Meilisearch, OpenAI, and PostHog interfaces exist. Search classifies intent locally and optional-provider failures degrade truthfully without substituting demo inventory in production. Live providers remain unverified. |
| Tests and operational quality | 9 | 7 | Platform verification, encoding checks, typecheck, lint, production builds, unit/E2E coverage, Lighthouse, smoke tooling, and release evidence templates exist. Clean CI and production-origin PWA results remain required. |
| **Total** | **100** | **85** | **Strong conditional candidate; not release-approved yet.** |

## Why the score increased

The score moved from **78 to 82** based on implemented and locally evidenced improvements:

- A single-application contract verifies the PWA, backend, and Railway cron runner.
- Production Next.js and mobile-first PWA builds pass.
- AI request context is sanitized and authorization-relevant identity is derived server-side.
- Natural-language search works deterministically without OpenAI; an available model can refine language but cannot invent trusted filters.
- Classification covers category confidence and evidence, budget, condition, fulfillment, seller trust, and safety signals.
- International formatting and bidirectional-layout foundations are represented and tested.

No credit was awarded for unconfigured production providers or unproven production-origin mobile-device journeys.

## Latest reliability implementation

- The header now exposes one Categories control and one Ask AI launcher at each responsive breakpoint; the misleading search-field AI badge was removed.
- Expensive AI routes use a hashed, atomic Supabase rate limiter shared across replicas and fail closed when the limiter is unavailable.
- Readiness reports sanitized required and optional component states with bounded provider checks and a release identifier.
- Public and server environment schemas are separated; the browser artifact scan confirms server-secret identifiers are absent from static chunks.
- Dependency policy, migration verification, artifact scans, immutable container tags, hosted-backend checks, and rollback procedures are release gates.
- Local platform, encoding, migration, typecheck, lint, production web build, dependency-policy, and browser-static secret checks pass.

The score is now **85** based on locally demonstrated centralized mutation protection, security-boundary, and truthful-degradation controls. GitHub, deployment, and real-device PWA evidence remain unawarded.

## Confirmed implementation

- Web targets Railway or a compatible container host. GitHub Pages is intentionally unsupported because the application requires server routes.
- The installable PWA uses the same hosted HTTPS product on mobile browsers and supports offline fallback, camera/photo input, and sharing without a separate native workspace.
- Physical-goods payments remain on Stripe; server secrets are not embedded in browser assets.
- CI covers lint, typecheck, unit tests, browser E2E, Lighthouse/accessibility, web build, container health, fresh Supabase migration, and client secret scanning.
- Railway deploys from the connected GitHub `main` branch; release workflows provide immutable container evidence.
- Ordinary search and Ask AI share a deterministic classifier, keeping discovery useful when OpenAI or Meilisearch is unavailable.

## Path to 90+

| Proof delivered | Points | Target |
| --- | ---: | ---: |
| Clean GitHub CI matrix and fresh database reset | +1 | 86 |
| Healthy HTTPS deployment with DNS, redirects, webhooks, email, search, monitoring, and rollback verified | +2 | 88 |
| Installed PWA on iOS Safari and Android Chrome with real-device journey evidence | +2 | 90 |
| Complete transaction, accessibility, offline, deletion, and AI-quality evidence on mobile devices | +2 | 92 |
| Measured PWA install, update, and return-visit reliability | +2 | 94 |

Scores above 94 are reserved for observed production reliability, store approval, crash-free sessions, performance budgets, incident readiness, and measured user outcomes. Source code alone cannot earn those points.

## Release blockers

- [ ] Complete GitHub Actions CI passes from a clean checkout with `npm ci`.
- [ ] `supabase db reset` succeeds and the production migration is applied.
- [ ] Production dependency findings have no unaccepted high/critical risks; exceptions have an owner and expiry.
- [ ] Production `/api/health` and `/api/health/ready` checks pass over HTTPS.
- [ ] Supabase redirects, Stripe webhooks/Connect, Meilisearch, Resend, OpenAI, DNS, TLS, monitoring, and rollback are configured and tested.
- [ ] Installed PWA on iOS Safari and Android Chrome passes real-device buyer and seller journeys.
- [ ] Auth, photo listing, search, messaging, favorites, checkout, onboarding, sharing, offline recovery, and account deletion pass on mobile devices.
- [ ] Browser artifacts pass server-secret scans.
- [ ] Privacy disclosures and support details match deployed providers and behavior.

## Reproducible checks

```bash
npm ci
npm run release:check
npm audit --omit=dev
```

Infrastructure and browser checks run through `.github/workflows/ci.yml`. Record release proof using `docs/release-evidence-template.md`.

## Score policy

- **90–100:** release candidate or measured production maturity.
- **75–89:** conditional; implementation is strong but release evidence is incomplete.
- **50–74:** major readiness gaps.
- **Below 50:** not deployable.

Recalculate only from attached CI, artifact, endpoint, and real-device PWA evidence.
