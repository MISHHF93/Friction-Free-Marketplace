# Production release guide

Rollback and immutable-artifact recovery procedures are defined in `docs/rollback-runbook.md`. Every release must identify the Git commit, migration level, web deployment, container SHA tag, native version, and native build number in `docs/release-evidence-template.md`.

## Architecture

The Next.js application is the canonical UI and server. Vercel or the included container runs its API routes and integrations. Capacitor packages that HTTPS origin as Android and iOS applications and exposes native deep linking, back navigation, network recovery, camera/photo input, and sharing. No server secret belongs in a browser or native build.

GitHub Pages cannot run this application because it needs Next.js server routes. Use the Vercel workflow or publish the container from `release-web.yml`.

## Production services and environment

Provision Supabase, Stripe Connect, Meilisearch, Resend, PostHog, OpenAI, DNS, and an HTTPS hostname. Configure every required value from `.env.example` in Vercel or the container runtime. Use live Stripe keys only in production.

Configure:

- Supabase Site URL as the production origin and allow `/auth/callback`, `ffmarketplace://auth/callback`, and approved preview URLs.
- Stripe webhook as `https://<origin>/api/stripe/webhooks`; record its signing secret.
- Meilisearch on a private authenticated endpoint reachable by the server.
- Supabase Storage buckets and policies from the canonical migrations; listing and message bytes upload directly with short-lived, user-scoped signed tokens so serverless request-size limits are not involved.
- `APPLE_TEAM_ID` and comma-separated Play signing fingerprints in `ANDROID_SHA256_CERT_FINGERPRINTS`.
- DNS and TLS before generating store builds.

Verify `/api/health`, `/api/health/ready`, `/.well-known/apple-app-site-association`, and `/.well-known/assetlinks.json` on the final hostname. The readiness endpoint rejects incomplete runtime configuration. The mobile release workflow derives the Android and iOS verified-link hostname from its required production URL input.

## GitHub secrets

Web secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and optional `NEXT_PUBLIC_POSTHOG_KEY`.

Web repository variables: `PRODUCTION_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_POSTHOG_HOST`. Although these values are public in browser bundles, keeping environment-specific values in GitHub configuration makes container builds reproducible.

Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Enroll the package `com.frictionfreemarketplace.app` in Play App Signing and put its SHA-256 certificate fingerprints in the web environment.

iOS: `APPLE_TEAM_ID`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, and `APP_STORE_CONNECT_API_PRIVATE_KEY`. Register the same bundle ID and enable Associated Domains.

Never commit keystores, provisioning profiles, API private keys, service-role keys, or live payment credentials.

For manual container builds, pass every `NEXT_PUBLIC_*` value as a Docker `--build-arg`; Next.js embeds these browser-safe values during compilation. Supply server-only credentials only when running the final image.

## Store preparation

Use application name “Friction-Free Marketplace,” bundle/package ID `com.frictionfreemarketplace.app`, category Shopping, support URL `/contact`, privacy URL `/privacy`, and account deletion at `/account/settings`.

Before submission:

- Replace the starter privacy policy with counsel-approved company identity, retention, regional-rights, and contact details.
- Complete Apple privacy nutrition labels and Google Play Data Safety using the deployed providers and actual collection practices.
- Explain that Stripe pays for physical marketplace goods, not digital content.
- Provide a reviewer buyer account and seller account, test listing, checkout instructions, and any region limitations.
- Supply branded 1024×1024 icon, Android feature graphic, phone/tablet screenshots, description, keywords, support contact, and age/content ratings.
- Confirm camera permission appears only when adding listing or message photos.
- Exercise account deletion, OAuth, external Stripe flows, deep links, and offline recovery on real devices.
- Apply canonical Supabase migration `20260727000000_account_deletion_retention.sql`; deletion anonymizes personal profile/contact data and soft-deletes authentication while retaining required transaction and ledger references.

## Release sequence

1. Merge only after CI passes lint, types, unit tests, browser tests, accessibility checks, web/container builds, Android bundle, and unsigned iOS compilation.
2. Run “Release web” and verify production health, migrations, webhooks, auth redirects, search, email, analytics, and monitoring.
3. Run “Release mobile” with the exact production origin, semantic store version, and a monotonically increasing integer build number. It uploads Android to Play internal testing and iOS to TestFlight.
4. Complete real-device buyer/seller smoke tests and secret scans on downloaded artifacts.
5. Promote through closed testing, staged production, and TestFlight review before full availability. Monitor server errors, Stripe webhooks, auth failures, and crash reports; halt promotion on regressions.

Run the manual “Production proof” workflow against the final HTTPS origin and retain its artifact with the release. Complete `docs/release-evidence-template.md` with identifiers and evidence from the authenticated buyer/seller transaction; public endpoint checks are not a substitute for payment, webhook, trust, account-deletion, or real-device proof.

The workflows intentionally require manual dispatch. Store credentials and legal/store-console declarations cannot be generated safely by the repository.
