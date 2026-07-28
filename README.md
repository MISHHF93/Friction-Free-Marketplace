# Friction-Free Marketplace

Friction-Free Marketplace is an AI-powered consumer commerce platform built around safe discovery, trusted transactions, governed AI assistance, manual-capture Stripe Connect payment protection, Meilisearch discovery, Resend transactional email, PostHog analytics, and Supabase-backed marketplace data.

## What is included

This repository contains a Next.js App Router web application in `apps/web` and the canonical deployable Supabase schema in `supabase/migrations`.

- **App Router + TypeScript:** public marketplace pages, authenticated dashboards, admin surfaces, API routes, and middleware.
- **Tailwind CSS + shadcn/ui-style components:** reusable buttons, cards, forms, labels, inputs, badges, listing cards, dashboards, and shells.
- **Supabase:** SSR/browser/admin clients, auth middleware, database types, RLS-oriented SQL migration, and seed categories.
- **Stripe Connect:** seller onboarding, checkout/payment intent, escrow transaction routes, webhooks, refunds, disputes, and release flows.
- **OpenAI SDK:** listing copy/photo interpretation and governed AI agent API scaffolds.
- **Meilisearch:** discovery schema, index configuration, search payload builder, sync route, and search APIs.
- **Resend:** server email helper for transactional marketplace messages.
- **PostHog:** server-side analytics capture helper for product events.
- **Zod + React Hook Form:** listing and auth validation powering usable forms.
- **Vitest + Playwright:** starter unit and E2E tests with project config.

## Repository structure

```txt
apps/web/
  app/                  Next.js routes, API endpoints, layouts, and pages
  actions/              Server Actions for listings and checkout orchestration
  components/           shadcn/ui-style primitives and feature components
  lib/                  Supabase, Stripe, OpenAI, Meilisearch, Resend, PostHog, validation, and domain helpers
  tests/                Vitest unit tests and Playwright E2E specs
  middleware.ts         Supabase session refresh and protected-route guards
  .env.example          Local configuration template

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

2. Create local environment variables:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Fill in at least these values in `apps/web/.env.local`:

   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
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

6. Open [http://localhost:3000](http://localhost:3000).

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
```

## Production deployment

The full Next.js application can deploy from GitHub to Vercel or as the included Docker image. Android and iOS projects live in `apps/mobile`; they require a deployed HTTPS web origin and store credentials. See [docs/production-release.md](docs/production-release.md) for the complete web, Play Store, and App Store procedure.

The current evidence, weighted readiness score, and release blockers are tracked in [docs/production-readiness-scorecard.md](docs/production-readiness-scorecard.md). Run `npm run release:check` for the portable application checks; GitHub Actions additionally validates Docker, Supabase, Android, iOS, browser, and artifact-specific requirements.

After deploying a real HTTPS origin, run `PRODUCTION_URL=https://market.yourdomain.com npm run production:smoke` with the actual hostname. The manual “Production proof” workflow records public-origin and browser evidence. Use [docs/release-evidence-template.md](docs/release-evidence-template.md) to prove the authenticated buyer, seller, protected-payment, trust, and real-device journeys before promotion.

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
stripe listen --forward-to localhost:3000/api/stripe/webhooks
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
