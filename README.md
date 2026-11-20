# Friction-Free Marketplace

Friction-Free Marketplace is an AI-powered consumer commerce platform built around safe discovery, trusted transactions, governed AI assistance, manual-capture Stripe Connect payment protection, Meilisearch discovery, Resend transactional email, PostHog analytics, and Supabase-backed marketplace data.

## What is included

This is the single source repository for the complete product: the hosted Next.js web application and backend, the Android application, the iOS application, shared packages, database schema, infrastructure, CI, and store-release automation. Android and iOS are Capacitor packages of the same hosted product; they are not separate products or repositories.

- **App Router + TypeScript:** public marketplace pages, authenticated dashboards, admin surfaces, and API routes. Next.js 16 uses `apps/web/proxy.ts` as the request proxy (the successor to `middleware.ts`).
- **Tailwind CSS + shadcn/ui-style components:** reusable buttons, cards, forms, labels, inputs, badges, listing cards, dashboards, and shells.
- **Supabase:** SSR/browser/admin clients, auth middleware, database types, RLS-oriented SQL migration, and seed categories.
- **Stripe Connect:** seller onboarding, checkout/payment intent, escrow transaction routes, webhooks, refunds, disputes, and release flows.
- **OpenAI SDK:** listing copy/photo interpretation and governed AI agent API scaffolds.
- **Meilisearch:** discovery schema, index configuration, search payload builder, sync route, and search APIs.
- **Resend:** server email helper for transactional marketplace messages.
- **PostHog:** server-side analytics capture helper for product events.
- **Zod + React Hook Form:** listing and auth validation powering usable forms.
- **Vitest + Playwright:** starter unit and E2E tests with project config.
- **Capacitor Android + iOS:** native packages, deep links, camera, sharing, connectivity recovery, safe areas, and store metadata in `apps/mobile`.

## One repository, three application targets

```text
GitHub repository
├── apps/web        Next.js UI, API routes, authentication, commerce, and AI
├── apps/mobile
│   ├── android     Google Play application project
│   └── ios         Apple App Store application project
├── packages        Code shared by repository workspaces
├── supabase        Canonical database migrations
└── .github         Web, Android, and iOS CI/release workflows
```

The web deployment is authoritative for marketplace data and server APIs. Both native applications securely load that HTTPS origin and add native behavior through Capacitor. Server secrets remain only in the hosted web/backend environment.

The canonical native identity is:

- Application ID: `com.frictionfreemarketplace.app`
- Display name: `Friction-Free Marketplace`
- Mobile origin input: `CAPACITOR_SERVER_URL`

## Repository structure

```txt
apps/web/
  app/                  Next.js routes, API endpoints, layouts, and pages
  actions/              Server Actions for listings and checkout orchestration
  components/           shadcn/ui-style primitives and feature components
  lib/                  Supabase, Stripe, OpenAI, Meilisearch, Resend, PostHog, validation, and domain helpers
  tests/                Vitest unit tests and Playwright E2E specs
  proxy.ts              Request proxy: session checks and protected-route guards
  ../../.env.example    Authoritative environment variable list

apps/mobile/
  src/                  Native fallback/bridge source
  android/              Google Play Android project
  ios/                  Apple App Store iOS project
  capacitor.config.ts   Shared native-shell configuration

supabase/
  migrations/           Canonical ordered production schema

database/
  migrations/           Legacy/reference migration extracts
  seeds/                Starter seed data

docs/                   Product and technical architecture blueprints
```

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project
- Stripe account with Connect enabled
- OpenAI API key
- Meilisearch instance (local Docker or hosted)
- Resend API key
- PostHog project key

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment variables from the repository root. `.env.example` is the only variable list:

   ```bash
   cp .env.example apps/web/.env.local
   ```

3. Fill in the required values in `apps/web/.env.local`. Optional services (OpenAI, Meilisearch, Resend, and PostHog) can stay empty; the app degrades instead of crashing. Supabase and Stripe are required for live accounts and checkout:

   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   OPENAI_API_KEY=sk-...
   MEILISEARCH_HOST=http://127.0.0.1:7700
   MEILISEARCH_API_KEY=masterKey
   RESEND_API_KEY=re_...
   POSTHOG_KEY=phc_...
   ```

4. Apply the database starter migration and seed data in Supabase SQL editor or with the Supabase CLI:

   ```bash
   supabase db push
   psql "$DATABASE_URL" -f database/seeds/categories.sql
   ```

   Local `supabase db reset` applies the configured seed automatically. For hosted projects, use the PostgreSQL connection string with `psql` or run the seed in the Supabase SQL editor.

5. Run the web app:

   ```bash
   npm run web:dev
   ```

6. Open [http://localhost:3001](http://localhost:3001).

## Useful commands

```bash
npm run web:dev        # Start the Next.js app
npm run web:build      # Build the app
npm run web:lint       # Run Next.js ESLint
npm run web:typecheck  # Run TypeScript checks
npm run web:test       # Run Vitest unit tests
npm run web:test:e2e   # Run Playwright E2E tests
npm run mobile:sync    # Sync web bridge and plugins into Android/iOS
npm run mobile:doctor  # Verify local Capacitor toolchains
npm run platform:verify # Prove web, Android, and iOS remain one repository/product
npm run platform:build  # Build shared code, hosted web, and portable mobile bridge
npm run platform:sync   # Verify and sync Capacitor Android/iOS projects
```

## Vercel layout

`vercel.json` lives at the repository root and runs `npm ci` and `npm run web:build` from that root. Set the Vercel project's Root Directory to the repository root, not `apps/web`. A root of `apps/web` would not see this file, and the old `cd ../..` commands only made sense if the file itself lived in `apps/web`.

Scheduled routes are Vercel Cron GET requests. Set `CRON_SECRET` (sent as `Authorization: Bearer`) or the route's own bearer secret (`SCHEDULED_JOB_SECRET` for notifications and offer expiry, `SEARCH_SYNC_SECRET` for search sync). A missing secret returns 503.

Public image build arguments are required. Pass `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `docker build`. The image does not bake placeholder values for those variables.

## Production deployment

The full Next.js application can deploy from GitHub to Vercel or as the included Docker image. Android and iOS projects live in `apps/mobile`; they require a deployed HTTPS web origin and store credentials. See [docs/production-release.md](docs/production-release.md) for the complete web, Play Store, and App Store procedure.

The current evidence, weighted readiness score, and release blockers are tracked in [docs/production-readiness-scorecard.md](docs/production-readiness-scorecard.md). Run `npm run release:check` for the portable application checks; GitHub Actions additionally validates Docker, Supabase, Android, iOS, browser, and artifact-specific requirements.

After deploying a real HTTPS origin, run `PRODUCTION_URL=https://market.yourdomain.com npm run production:smoke` with the actual hostname. The manual “Production proof” workflow records public-origin and browser evidence. Use [docs/release-evidence-template.md](docs/release-evidence-template.md) to prove the authenticated buyer, seller, protected-payment, trust, and real-device journeys before promotion.

## Architecture

The hosted product is `apps/web`, a Next.js App Router application. `packages/shared` holds code shared with other workspaces. `apps/mobile` is a Capacitor shell around the same hosted origin. `supabase/migrations` is the database history; `database/migrations` is reference material and is not applied on its own.

`apps/web/proxy.ts` runs on each matched request. It checks mutation origins and redirects unauthenticated visitors away from dashboard, admin, and account pages. API handlers still check the caller themselves. A local auth bypass exists only when `ALLOW_DEV_AUTH_BYPASS=true`, the process is not production, Vercel, or CI, the Host is loopback, and the bypass cookie is present. It never grants admin.

The document language follows the signed-in profile locale, then the browser language, and otherwise English left-to-right. There is no translation catalog yet.

## Mobile and installed web app

The web app uses one phone shell at every width. On a larger screen the same column is centered at about 480px, with a neutral backdrop around it. Admin pages use the same bar and tabs in a slightly wider column so tables stay readable. A bottom tab bar (Home, Search, Sell, Messages, Account) and a compact top bar with back navigation are always present. Listing checkout stays sticky above that bar. `apps/web/public/sw.js` serves the offline page for public navigations and never caches `/api` or signed-in routes. The Capacitor projects in `apps/mobile` keep loading the hosted web origin. Nothing in this repository publishes a store build.

## Marketplace MCP

`/api/mcp` is a Streamable HTTP Model Context Protocol endpoint. It stays off unless `FFM_MCP_ENABLED=1`. Discovery is `GET /.well-known/mcp`.

Public read-only tools:

- `search_listings` with query, category, price range, and location
- `get_listing`
- `get_seller_public_profile`
- `list_categories`

These tools return public listing and profile fields only. They do not create payments, refunds, or payouts. Authenticated tools (`my_listings`, `my_offers`, `my_orders`, `create_offer`) are not enabled. The planned path is a per-user Supabase bearer token checked with row-level security, never the service-role key, and `create_offer` would require a second confirmation call.

## Database notes

The ordered files in `supabase/migrations` are the source of truth for fresh and incremental deployments. They include commerce, messaging, discovery, trust, payment, administration, AI, audit, notification, ledger, and account-retention structures. Files under `database/migrations` are retained as focused reference extracts and must not be used instead of the canonical Supabase migration history.

## Stripe Connect notes

The Stripe routes are designed for marketplace escrow-style flows:

- sellers onboard through Express Connect;
- buyers create manual-capture payment intents;
- webhooks update escrow and transaction state;
- admin/seller routes can capture, release, refund, and dispute transactions.

Use the Stripe CLI for local webhook development:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhooks
```

## Meilisearch notes

Run a local Meilisearch instance for development:

```bash
docker run --rm -p 7700:7700 -e MEILI_MASTER_KEY=masterKey getmeili/meilisearch:latest
```

The app exposes search API routes and helper functions that configure and sync the discovery index.

## Testing notes

The starter includes:

- unit tests for listing validation and search payload construction;
- Playwright E2E coverage for home-page navigation.

Install dependencies first, then run `npm run web:test` and `npm run web:test:e2e`.
