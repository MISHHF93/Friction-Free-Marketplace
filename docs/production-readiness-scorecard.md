# Production readiness scorecard

**Assessment date:** 2026-07-27  
**Overall score:** 78/100  
**Decision:** Conditional — implementation is substantially complete, but public web and store promotion are blocked until the release gates below pass.

This score measures demonstrated release readiness, not the number of files or planned features. A configured workflow receives partial credit until it has produced a passing artifact in the target environment.

## Weighted assessment

| Area | Weight | Score | Evidence and remaining work |
| --- | ---: | ---: | --- |
| Web deployment and PWA | 15 | 14 | Next.js standalone output, Vercel/container workflows, health/readiness routes, manifest, icons, install metadata, offline page, and conservative service worker are present. Production-origin smoke testing remains. |
| Backend and data | 15 | 12 | Canonical ordered Supabase migrations, RLS-oriented schema, direct signed uploads, API health checks, and CI fresh-database reset exist. The full reset still needs a passing supported-runner result. |
| Security, privacy, and compliance | 15 | 12 | Server-only environment validation, CSP/permission headers, authenticated upload signing, privacy/terms/support surfaces, account deletion, association files, and secret scans are implemented. Three high-severity production dependency advisories and final legal review remain. |
| Android | 12 | 9 | Capacitor project, package ID, verified links, network/back/share/camera behavior, permissions, branded assets, versioning, release bundle workflow, and signing placeholders exist. A signed AAB and physical-device test are not yet evidenced. |
| iOS | 12 | 9 | Capacitor project, bundle ID, associated domains, safe areas, privacy manifest, permission text, native behavior, archive workflow, and TestFlight upload path exist. A signed archive and physical-device test are not yet evidenced. |
| CI/CD and portability | 12 | 10 | Locked installs, web/browser/database/container/Android/iOS jobs, Vercel/GHCR releases, Play/TestFlight releases, and preflight validation exist. The complete workflow matrix must pass in GitHub. |
| Marketplace integrations | 10 | 7 | Supabase, Stripe Connect, Resend, Meilisearch, OpenAI, and PostHog interfaces are configured without embedding server secrets. Live auth, payment, webhook, email, search, and seller-onboarding journeys require production credentials and verification. |
| Tests and operational quality | 9 | 5 | Local typecheck, lint, web production build, and mobile TypeScript build passed. Unit/E2E execution is blocked locally by Windows application control; Docker, Android SDK, Xcode, and Supabase CLI are unavailable locally. CI and real-device evidence are still required. |
| **Total** | **100** | **78** | **Not release-approved yet.** |

## Confirmed implementation

- Web can run on Vercel or any compatible container host; GitHub Pages is intentionally unsupported because the product requires server routes.
- Android and iOS reuse the hosted HTTPS application through Capacitor while providing native deep links, navigation, connectivity recovery, camera/photo input, sharing, safe areas, and external-browser handling.
- Physical-goods checkout remains on Stripe. No Apple or Google in-app purchase integration is required for that transaction model.
- The mobile packages contain public configuration only. Stripe, Supabase service-role, OpenAI, Resend, and Meilisearch secrets remain on the hosted server.
- CI covers lint, typecheck, unit tests, browser E2E, Lighthouse/accessibility, web build, container health, fresh Supabase migration, Android bundle, iOS compilation, and client artifact secret scanning.
- Release workflows cover Vercel, GHCR, Play internal testing, and TestFlight using encrypted repository credentials.

## Release blockers

All items below must be closed before changing the decision to **release-approved**:

- [ ] The complete GitHub Actions CI matrix passes from a clean checkout with `npm ci`.
- [ ] `supabase db reset` succeeds from an empty database and the production migration is applied.
- [ ] `npm audit --omit=dev` has no unaccepted high/critical findings. Current observation: 3 high, 0 critical.
- [ ] The production web deployment returns success from `/api/health` and `/api/health/ready`.
- [ ] Apple and Android association endpoints return HTTP 200 with the real Apple team ID and Play signing fingerprints.
- [ ] Live Supabase redirects, Stripe webhooks/Connect, Meilisearch, Resend, OpenAI, DNS, and TLS are configured and smoke tested.
- [ ] A signed Android App Bundle reaches Play internal testing and passes buyer and seller journeys on a physical Android device.
- [ ] A signed iOS archive reaches TestFlight and passes the same journeys on a physical iPhone or iPad.
- [ ] Signup/login callbacks, listing/photo creation, search, messaging, favorites, checkout, seller onboarding, sharing, deep links, offline recovery, and account deletion pass on web, Android, and iOS.
- [ ] Downloaded browser, AAB, and IPA artifacts pass a server-secret scan.
- [ ] Company identity, privacy/retention terms, store privacy declarations, support contact, screenshots, descriptions, ratings, and reviewer accounts are finalized.
- [ ] Error, webhook, authentication, and native crash monitoring is connected and tested before staged rollout.

## Reproducible checks

Run the portable application gate:

```bash
npm ci
npm run release:check
npm audit --omit=dev
```

The authoritative infrastructure and native checks run in `.github/workflows/ci.yml`. Release procedures, required secrets, provider callbacks, and staged rollout are documented in `docs/production-release.md`.

## Score policy

- **90–100:** release candidate; only final store/provider approval may remain.
- **75–89:** conditional; implementation is strong but one or more release gates lack evidence.
- **50–74:** major readiness gaps.
- **Below 50:** not deployable.

Recalculate the score only from attached CI, artifact, endpoint, and real-device evidence. Closing every blocker should move the repository into the 90+ release-candidate band; store approval itself remains external.
