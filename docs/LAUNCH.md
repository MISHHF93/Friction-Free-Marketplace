# Launch checklist

The host runs these steps. This repository does not deploy, change hosting, DNS, or a payment account, and it does not send live charges or real email.

`supabase/migrations` is the only schema history. `database/migrations` is an archived draft and must not be applied. Apply every file in `supabase/migrations` in filename order. The newest migration is `20260728160000_round7_followups.sql`. `20260728150000_launch_blocker_guards.sql` is already part of the schema history on `main`.

`supabase/seed.sql` is not part of this repository. `scripts/prod/reference-data.sql` inserts missing categories and verification levels inside a transaction and does not overwrite rows that already exist. Do not run seed listings or seed users in production.

`scripts/prod/reset-demo-data.sql` ends in `ROLLBACK`. Leave that line until the dry-run counts are expected. It refuses to run unless the session has `select set_config('app.reset_allowed', 'yes', true);`. It deletes seed users (`11111111-1111-4111-8111-111111111111`, `22222222-2222-4222-8222-222222222222`, and `@example.com`), e2e transaction ids `44444444-4444-4444-8444-444444444444`, `55555555-5555-4555-8555-555555555555`, and `66666666-6666-4666-8666-666666666666` (those three are transactions, not users), `is_demo` transactions only when a party is one of those seed users, listings owned by those sellers, and the receipts, payouts, escrow rows, and ledger rows that belong to them. It raises if a seed user still has any other transaction, payment, or ledger row. It does not delete a listing because of its title.

`scripts/prod/preflight.sql` lists every `@example.com` user before a reset would delete them, and counts the same demo transactions. Before applying `20260728150000_launch_blocker_guards.sql` on a host that does not already have it, run the two duplicate-checkout queries in that file. If a query returns a row, resolve the duplicate before applying the migration, or the unique-index rebuild aborts. A later migration cannot prevent that abort.

The reset script does not delete Storage objects. SQL removal of `storage.objects` leaves the file bytes behind. After the reset, delete each seed user's files with the Storage API under `listing-images/<user-id>/` and `message-attachments/<user-id>/`.

## Production environment

Set these and leave the values out of git. Names match `apps/web/lib/env.server-schema.ts` plus the process variables the server reads directly.

Required at boot. The server throws if one is missing, and it throws in production if a value contains `placeholder`, `example.com`, or `your-`.

- `NEXT_PUBLIC_APP_URL` (HTTPS). This origin is the only browser origin allowed to call mutating routes.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPPORT_EMAIL`
- `RESEND_FROM_EMAIL` (a verified sending domain; do not ship `hello@example.com`)

Required for the live payment and mail path, even though the schema marks some of them optional:

- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SCHEDULED_JOB_SECRET` or `CRON_SECRET` for notifications, offer expiry, reconcile, and auto-release
- `SEARCH_SYNC_SECRET` or `CRON_SECRET` for `/api/search/sync`

Optional, with the behavior when unset:

- `NEXT_PUBLIC_APP_NAME` defaults to Friction-Free Marketplace
- `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_KEY` (analytics stays off)
- `NEXT_PUBLIC_POSTHOG_HOST` and `POSTHOG_HOST` default to `https://app.posthog.com`
- `OPENAI_API_KEY` (assistant features fail closed)
- `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, and `MEILISEARCH_LISTINGS_INDEX` (search falls back to the database)
- `ADMIN_WORKER_SECRET` and `HEALTH_CHECK_SECRET` (readiness can also use the worker secret)
- `APPLE_TEAM_ID` and `ANDROID_SHA256_CERT_FINGERPRINTS` (native association files)
- `FFM_BIND_HOST` and `FFM_TRUSTED_PROXY_HOPS` (local bind and proxy hop count; leave unset in production)
- `RELEASE_SHA` (health output falls back to the Vercel git SHA)

Flags that must stay unset:

- `ALLOW_DEV_AUTH_BYPASS`
- `FFM_E2E_AUTH`
- `MARKETPLACE_DEMO_MODE`
- `FFM_MCP_ENABLED`

Use live Stripe keys (`sk_live_` and `pk_live_`) together. Checkout uses the real PaymentIntent flow when those keys are present. Placeholder keys leave checkout unconfigured.

## Stripe webhooks

Create two live endpoints. The handled events are the cases in `apps/web/lib/payments/stripe-events.ts`.

Platform, `/api/stripe/webhooks`, secret `STRIPE_WEBHOOK_SECRET`:

- `payment_intent.succeeded`
- `payment_intent.amount_capturable_updated`
- `payment_intent.canceled`
- `payment_intent.payment_failed`
- `payment_intent.requires_action`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `transfer.created`
- `transfer.updated`
- `transfer.reversed`
- `payout.created`
- `payout.updated`
- `payout.paid`
- `payout.failed`
- `payout.canceled`

Connect, `/api/stripe/connect/webhook`, secret `STRIPE_CONNECT_WEBHOOK_SECRET`:

- `account.updated`
- `account.application.deauthorized`

Connect onboarding returns to `{NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=return` and refreshes at `{NEXT_PUBLIC_APP_URL}/dashboard/payments?onboarding=refresh`.

## Supabase Auth

- Site URL: `NEXT_PUBLIC_APP_URL`
- Redirect URLs: `{NEXT_PUBLIC_APP_URL}/auth/callback` and `{NEXT_PUBLIC_APP_URL}/**`
- Email templates (confirm signup, magic link, reset password, change email) must use that site URL, not localhost

## Browser policy

`apps/web/lib/security/csp.ts` allows:

- Supabase: `https://*.supabase.co` and `wss://*.supabase.co`
- Stripe: `https://js.stripe.com`, `https://hooks.stripe.com`, and `https://api.stripe.com`
- PostHog: `https://*.posthog.com`

Meilisearch is called from the server, not the browser. Mutating routes accept only the `Origin` of `NEXT_PUBLIC_APP_URL`.

## Hosting

Set the Vercel project Root Directory to the repository root so the root `vercel.json` runs `npm ci`, `npm run web:build`, and the cron paths. `apps/web/vercel.json` repeats those crons only if the project root is `apps/web`.

Hourly crons need Vercel Pro. The committed schedules are:

- `/api/notifications/dispatch` at minute 0
- `/api/payments/reconcile` at minute 10
- `/api/offers/expire` at minute 15
- `/api/search/sync` at minute 30
- `/api/payments/auto-release` at minute 40

On Hobby, Vercel only allows daily cron. Use one daily pass instead, for example `0 3 * * *`, `10 3 * * *`, `15 3 * * *`, `30 3 * * *`, and `40 3 * * *`, and expect offers, search, reconcile, and auto-release to wait until that hour.

Enable database backups and point-in-time recovery before the first live charge. Rollback steps are in [docs/rollback-runbook.md](rollback-runbook.md). Watch `/api/health` and `/api/health/ready`, and send application errors to the host's error and uptime monitors. This repository does not configure those monitors.

## After deploy

Run `scripts/prod/preflight.sql` and confirm:

- the migration list matches `supabase/migrations`
- the RLS query returns no rows
- seed user count is 0
- e2e transaction count is 0
- demo listing count is 0
- active categories are greater than 0
- the privilege and escrow functions are present
- `contact_messages` has an admin read policy and no public insert

If categories are missing, run `scripts/prod/reference-data.sql`. If demo rows remain, review the dry-run counts, set `app.reset_allowed`, then replace `ROLLBACK` with `COMMIT` and run `scripts/prod/reset-demo-data.sql` once.

Smoke test with two real people, not seed accounts:

1. Sign up user A and user B in separate browsers.
2. Sign out A and sign in B in the first browser. The header, dashboard, settings, orders, and messages must show only B.
3. User B publishes a listing with a photo.
4. User A sends an offer and a message.
5. User A checks out for a small live amount.
6. User B marks the order shipped. User A confirms delivery and releases, or opens a dispute. Buyers do not refund themselves.
7. Close that dispute from admin with refund, release, or split. The dispute stays `resolved_buyer` or `resolved_seller` for those two outcomes.
8. Submit the contact form and confirm a `contact_messages` row even if the notification email fails.

Empty marketplace pages should say that no listings matched, not show sample bikes, sofas, or camera kits.

## Verified build

Checked on this branch before the pull request. The host still runs the suite again before merge. The commit SHA is the pull request head.

- `npx tsc --noEmit` in `apps/web`: exit 0
- `npx vitest run` in `apps/web`: 35 files, 148 tests passed
- `npm run build --workspace apps/web` with `NEXT_DIST_DIR=.next-build`: Next.js 16.4.6 compiled successfully
- `npm audit --omit=dev` after the non-breaking upgrades: 2 high (zod 3 and openai 4, which needs zod 3). Zod 4 is a breaking upgrade and was not applied. Dev-only Vitest 5, Vite, esbuild, tinypool, and the minimatch copy inside typescript-eslint also remain because their fixes are major bumps.

## r10 lifecycle changes (local, not yet deployed)

- New cron `/api/payments/expire-checkouts` (every 30 min) cancels unpaid checkouts older than 45 minutes so the listing frees up. It uses the same `CRON_SECRET` / `SCHEDULED_JOB_SECRET`.
- `/api/offers/expire` also closes offers on listings that are no longer available and lifts timed suspensions that have ended.
- Two new migrations: `20261120000000_r10_account_deletion_open_order_guard.sql` (deletion refused while orders are open) and `20261120010000_r10_moderation_and_member_enforcement.sql` (admin holds sellers cannot undo, suspended or banned members cannot write, open orders block sold/archive, offers close with the listing, one admin listing-decision path). Apply with `supabase db push` after a backup.
- Database checks for these guards: `supabase/tests/r10_lifecycle.sql` (local database only; it rolls back).
- Sellers must have payouts active before a listing can be published.

## r11 lifecycle and performance (local, not yet deployed)

- No new Vercel cron. `/api/payments/expire-checkouts` (every 30 minutes, already in `vercel.json`) now also reminds sellers 24 hours before the acceptance deadline and auto-cancels uncaptured `paid` authorizations at 72 hours, or sooner if Stripe's `capture_before` is earlier. Open disputes are left alone. It uses the same `CRON_SECRET` / `SCHEDULED_JOB_SECRET`.
- Sales shows "Accept by {date}" on authorized orders. The "new order, accept by" notice is sent when payment is authorized, not when checkout first opens.
- Migration `20261122000000_r11_drop_duplicate_notification_triggers.sql` removes the duplicate message and offer notification triggers. Apply with `supabase db push` after a backup.
- Two more migrations for sponsored placements: `20261122010000_r11_ads_manage_permission.sql` (adds the `ads.manage` permission) and `20261122020000_r11_ads.sql` (placements, campaigns, daily event totals, and the public `ad-creatives` bucket). No new cron or env var. See `docs/ADS.md`.
- `/admin/ads` is the admin UI. Public pages hide empty slots, label live units “Sponsored”, and count clicks through `/api/ads/click/[id]` after an https-or-internal allow-list check.
- Transactional email is sent as soon as the notification is created. `/api/notifications/dispatch` (hourly, already in `vercel.json`) only retries rows that are still `queued` after a transport failure. No new cron or env var.
