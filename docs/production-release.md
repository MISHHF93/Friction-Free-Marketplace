# Production release guide

Rollback and immutable-artifact recovery procedures are defined in `docs/rollback-runbook.md`. Every release must identify the Git commit, migration level, web deployment, container SHA tag, native version, and native build number in `docs/release-evidence-template.md`.

## Architecture

The Next.js application is the only product app and server. Railway runs its container, UI, API routes, and integrations. It is an installable mobile-first PWA; there is no separate Capacitor workspace or Android/iOS store release. No server secret belongs in the browser bundle.

GitHub Pages cannot run this application because it needs Next.js server routes. Connect the GitHub `main` branch to Railway for deployment; `release-web.yml` builds and smoke-tests the immutable container artifact.

## Production services and environment

Provision Supabase, Stripe Connect, Meilisearch, Resend, PostHog, OpenAI, DNS, and an HTTPS hostname. Configure every required value from `.env.example` in Railway. Use live Stripe keys only in production.

Configure:

- Supabase Site URL as the production origin and allow `/auth/callback` and approved preview URLs.
- Stripe webhook as `https://<origin>/api/stripe/webhooks`; record its signing secret.
- Meilisearch on a private authenticated endpoint reachable by the server.
- Supabase Storage buckets and policies from the canonical migrations; listing and message bytes upload directly with short-lived, user-scoped signed tokens so serverless request-size limits are not involved.
- DNS and TLS before enabling the production PWA origin.

Verify `/api/health`, `/api/health/ready`, `/manifest.webmanifest`, and `/sw.js` on the final hostname. The readiness endpoint rejects incomplete runtime configuration. Test installation, login, and offline fallback in iOS Safari and Android Chrome.

## GitHub secrets

Container release secrets: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and optional `NEXT_PUBLIC_POSTHOG_KEY`.

Web repository variables: `PRODUCTION_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_POSTHOG_HOST`. Although these values are public in browser bundles, keeping environment-specific values in GitHub configuration makes container builds reproducible.

Never commit service-role keys or live payment credentials.

For manual container builds, pass every `NEXT_PUBLIC_*` value as a Docker `--build-arg`; Next.js embeds these browser-safe values during compilation. Supply server-only credentials only when running the final image.

## Release sequence

1. Merge only after CI passes lint, types, unit tests, browser tests, accessibility checks, and web/container builds.
2. Push to `main`; Railway deploys the connected PWA service. Verify production health, migrations, webhooks, auth redirects, search, email, analytics, and monitoring.
3. Complete buyer/seller smoke tests and install the PWA on real iOS and Android devices.
4. Monitor server errors, Stripe webhooks, auth failures, and crash reports; halt promotion on regressions.

Run the manual “Production proof” workflow against the final HTTPS origin and retain its artifact with the release. Complete `docs/release-evidence-template.md` with identifiers and evidence from the authenticated buyer/seller transaction; public endpoint checks are not a substitute for payment, webhook, trust, account-deletion, or mobile-device PWA proof.

The production proof workflow intentionally requires manual dispatch. Railway deploys from the connected GitHub `main` branch.
