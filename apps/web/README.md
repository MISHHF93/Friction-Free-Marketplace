# Friction-Free Marketplace Web App

Production-oriented Next.js App Router starter for the marketplace experience.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS and shadcn/ui-style primitives
- Supabase SSR clients and auth middleware
- Zod and React Hook Form for client validation
- Stripe server helper and checkout route scaffold
- OpenAI SDK server helper and listing-copy route scaffold

## Structure

- `app/`: public routes, auth routes, protected dashboard shells, and API route scaffolds.
- `components/`: layout, listing, form, and shadcn/ui-style reusable components.
- `lib/`: environment parsing, marketplace fixture data, Supabase, Stripe, OpenAI, and validation helpers.
- `types/`: generated-compatible Supabase database types.
- `middleware.ts`: session refresh and protected-route redirects for dashboard/admin surfaces.

## Environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local` before running `npm run web:dev` or `npm run web:build`. The app validates required variables at Next.js startup and also validates server-only and browser-safe variables when the corresponding modules load. Startup errors list each missing or invalid variable so deployment failures are actionable.

### Required variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Public Supabase project URL used by browser, server, and middleware Supabase clients. Must be a valid URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Public Supabase anonymous key used by browser and server session clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service-role key for privileged admin queries, AI audit writes, and back-office workflows. Never expose this to the browser. |
| `STRIPE_SECRET_KEY` | Server only | Stripe secret key used by checkout, escrow/payment-intent, Connect, capture, release, refund, and dispute APIs. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret used to verify incoming Stripe webhook events. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe publishable key used by browser checkout components and Stripe.js. |
| `OPENAI_API_KEY` | Server only | OpenAI API key used by listing-copy, listing-from-photos, buyer-intent, and agent routes. |
| `MEILISEARCH_HOST` | Server only | Meilisearch host URL used by search, recommendations, sync, trending, and discovery APIs. Must be a valid URL. |
| `MEILISEARCH_API_KEY` | Server only | Meilisearch API key used for authenticated search index reads and writes. |
| `RESEND_API_KEY` | Server only | Resend API key used to send marketplace transactional emails. |
| `POSTHOG_KEY` | Server only | PostHog project API key used for server-side analytics capture. |
| `NEXT_PUBLIC_APP_URL` | Client + server | Canonical marketplace URL used for callbacks, Stripe redirect URLs, email links, and app metadata. Must be a valid URL. |

### Optional variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Client + server | Display name for public app metadata. Defaults to `Friction-Free Marketplace`. |
| `SEARCH_SYNC_SECRET` | Server only | Shared secret for protected search sync jobs. Recommended for production automation. |
| `RESEND_FROM_EMAIL` | Server only | Default sender used by Resend email helpers. Defaults to `Friction-Free Marketplace <hello@example.com>`. |
| `POSTHOG_HOST` | Server only | PostHog host for server-side analytics. Defaults to `https://app.posthog.com`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Client | Optional browser analytics key if client-side PostHog capture is enabled. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client | Browser PostHog host. Defaults to `https://app.posthog.com`. |
| `PLAYWRIGHT_BASE_URL` | Test only | Base URL used by Playwright tests. |
| `PLAYWRIGHT_SKIP_WEB_SERVER` | Test only | Set to skip Playwright's local web server startup. |
