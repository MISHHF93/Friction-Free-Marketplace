# Launch checklist

The host runs these steps. This repository does not deploy, change hosting, or connect to a live database.

## Migration order

Apply every file in `supabase/migrations` in filename order. The preflight query lists what the database has already recorded. The newest launch migrations are:

1. `20260728120000_settlement_status_values.sql`
2. `20260728120100_dispute_settlement_and_ban_rank.sql`
3. `20260728130000_contact_messages.sql`

`supabase/seed.sql` is not part of this repository. `database/seeds/categories.sql` and `scripts/prod/reference-data.sql` are for local or empty databases. Do not run seed listings or seed users in production. `scripts/prod/reset-demo-data.sql` ends in `ROLLBACK` until a person changes that line.

## Production environment names

Set these and leave the values out of git:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `CRON_SECRET` or `SCHEDULED_JOB_SECRET` (the job routes accept either)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `POSTHOG_KEY`
- `POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Use live Stripe keys (`sk_live_` and `pk_live_`). Checkout uses the real PaymentIntent flow when those keys are present. Placeholder keys leave checkout unconfigured.

## Flags that must be unset

- `ALLOW_DEV_AUTH_BYPASS`
- `FFM_E2E_AUTH`
- `MARKETPLACE_DEMO_MODE`

`FFM_MCP_ENABLED` stays unset unless the host wants the read-only MCP endpoint. It does not take payment.

## Stripe

Create two live webhook endpoints:

- `/api/stripe/webhooks` with payment intent, charge, and dispute events used by escrow.
- `/api/stripe/connect/webhook` with account and capability events for Connect.

Put each signing secret in the matching env name above. Auth redirect URLs in Supabase must include `NEXT_PUBLIC_APP_URL` plus `/auth/callback`. Confirm the email templates use the production site URL.

## Hosting

Set the Vercel project Root Directory to the repository root so the root `vercel.json` runs `npm ci`, `npm run web:build`, and the cron paths. `apps/web/vercel.json` repeats those crons only if the project root is `apps/web`.

Crons: notifications hourly, offer expiry at minute 15, search sync at minute 30, payment reconcile at minute 10, auto-release at minute 40.

## After deploy

Run `scripts/prod/preflight.sql` and confirm:

- the migration list matches `supabase/migrations`
- the RLS query returns no rows
- seed user count is 0
- active categories are greater than 0

If categories are missing, run `scripts/prod/reference-data.sql`. If demo rows remain, review the dry-run counts in `scripts/prod/reset-demo-data.sql`, then replace `ROLLBACK` with `COMMIT` and run it once.

Smoke test with two real people, not seed accounts:

1. Sign up user A and user B in separate browsers.
2. Sign out A and sign in B in the first browser. The header, dashboard, settings, orders, and messages must show only B.
3. User B publishes a listing with a photo.
4. User A sends an offer and a message.
5. User A checks out for a small live amount.
6. User B marks the order shipped. User A confirms delivery and releases, or requests a refund.
7. Open a dispute on a second small order and close it from admin with one outcome.
8. Submit the contact form and confirm a `contact_messages` row.

Empty marketplace pages should say that no listings matched, not show sample bikes, sofas, or camera kits.
