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
- `FFM_MCP_ENABLED` (MCP at `/api/mcp` and `/.well-known/mcp` is enabled by default; set to `0` to disable)
- `FFM_BIND_HOST` and `FFM_TRUSTED_PROXY_HOPS` (local bind and proxy hop count; leave unset in production)
- `RELEASE_SHA` (health output falls back to the Railway git SHA)

Flags that must stay unset:

- `ALLOW_DEV_AUTH_BYPASS`
- `FFM_E2E_AUTH`
- `MARKETPLACE_DEMO_MODE`

Use live Stripe keys (`sk_live_` and `pk_live_`) together. Checkout uses the real PaymentIntent flow when those keys are present. Placeholder keys leave checkout unconfigured.

## Stripe webhooks

Create two live endpoints. The handled events are the cases in `apps/web/lib/payments/stripe-events.ts`.

Platform, `/api/stripe/webhooks`, secret `STRIPE_WEBHOOK_SECRET`:

- `payment_intent.succeeded`
- `payment_intent.amount_capturable_updated`
- `checkout.session.completed` (r12, self-serve ad payments only)
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

## Railway hosting

Connect the repository's `main` branch to a persistent web service with the repository root as its source directory. Railway detects the root `Dockerfile`; set `/api/health` as its healthcheck path. Provide the required production variables to the web service. Docker build-time `NEXT_PUBLIC_*` values are read through the `ARG` declarations in the Dockerfile and must also remain available at runtime.

Create six scheduled services from the same repository root. For each, set `RAILWAY_DOCKERFILE_PATH=/apps/cron/Dockerfile`, `RAILWAY_APP_URL=https://frictionfree.co`, the listed `RAILWAY_JOB_PATH`, and the same strong `CRON_SECRET` configured on the web service. The runner sends an authenticated GET request, fails the run on non-2xx responses, and exits when the request completes.

| Route | Schedule (UTC) |
| --- | --- |
| `/api/notifications/dispatch` | `0 * * * *` |
| `/api/payments/reconcile` | `10 * * * *` |
| `/api/offers/expire` | `15 * * * *` |
| `/api/search/sync` | `30 * * * *` |
| `/api/payments/expire-checkouts` | `5,35 * * * *` |
| `/api/payments/auto-release` | `40 * * * *` |

Railway schedules use UTC, can start a few minutes later than scheduled, and skip a run if its prior execution is still active. Monitor every scheduled service's run logs; these jobs perform payment reconciliation and automatic fund release as well as routine cleanup. Railway's cron services must use the `apps/cron/Dockerfile`, not the web Dockerfile.

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

## r10 lifecycle changes (on main; apply migrations before deploying)

- New cron `/api/payments/expire-checkouts` (every 30 min) cancels unpaid checkouts older than 45 minutes so the listing frees up. It uses the same `CRON_SECRET` / `SCHEDULED_JOB_SECRET`.
- `/api/offers/expire` also closes offers on listings that are no longer available and lifts timed suspensions that have ended.
- Two new migrations: `20261120000000_r10_account_deletion_open_order_guard.sql` (deletion refused while orders are open) and `20261120010000_r10_moderation_and_member_enforcement.sql` (admin holds sellers cannot undo, suspended or banned members cannot write, open orders block sold/archive, offers close with the listing, one admin listing-decision path). Apply with `supabase db push` after a backup.
- Database checks for these guards: `supabase/tests/r10_lifecycle.sql` (local database only; it rolls back).
- Sellers must have payouts active before a listing can be published.

## r11 lifecycle and performance (on main since 2026-11-22; apply migrations before deploying)

- `/api/payments/expire-checkouts` (every 30 minutes) also reminds sellers 24 hours before the acceptance deadline and auto-cancels uncaptured `paid` authorizations at 72 hours, or sooner if Stripe's `capture_before` is earlier. Open disputes are left alone. It uses the same `CRON_SECRET` / `SCHEDULED_JOB_SECRET`.
- Sales shows "Accept by {date}" on authorized orders. The "new order, accept by" notice is sent when payment is authorized, not when checkout first opens.
- Migration `20261122000000_r11_drop_duplicate_notification_triggers.sql` removes the duplicate message and offer notification triggers. Apply with `supabase db push` after a backup.
- Two more migrations for sponsored placements: `20261122010000_r11_ads_manage_permission.sql` (adds the `ads.manage` permission) and `20261122020000_r11_ads.sql` (placements, campaigns, daily event totals, and the public `ad-creatives` bucket). No new cron or env var. See `docs/ADS.md`.
- `/admin/ads` is the admin UI. Public pages hide empty slots, label live units “Sponsored”, and count clicks through `/api/ads/click/[id]` after an https-or-internal allow-list check.
- Transactional email is sent as soon as the notification is created. `/api/notifications/dispatch` (hourly) only retries rows that are still `queued` after a transport failure. No new job or env var.
- Local pickup uses a two-sided handoff: the seller marks the item handed over without a tracking number, the buyer confirms pickup, and funds still follow the existing delivered / release / auto-release path. No new cron or env var.
- Dispute evidence (`20261122030000_r11_dispute_evidence.sql`) adds a private `dispute-evidence` bucket and `dispute_evidence` rows (notes and photos) with RLS for the two parties and `disputes.decide` admins. Admins review it at `/admin/disputes/[id]`. No new cron or env var.
- Runtime errors are reported through a pluggable logger that writes JSON to the server logs only. There is no paid error service and no new env var.

## r12 self-serve advertising (on main since 2026-11-23; apply migrations before deploying)

- Anyone signed in can buy a sponsored placement at `/advertise` and track it at `/dashboard/ads`. Payment is a normal platform charge through Stripe Checkout (no Connect, no escrow). The ad only serves after payment and admin approval in `/admin/ads`. Rejecting refunds the payment through Stripe.
- New migration `20261123000000_r12_self_serve_ads.sql`: lifecycle columns on `ad_campaigns` (existing house campaigns keep serving as `approved`), the admin-editable `ad_pricing` table with placeholder prices, advertiser-only RLS, event counting only for approved ads, and the `advance_ad_campaign_lifecycle()` sweep. No new bucket: creatives go to `advertisers/<user id>/` in the existing `ad-creatives` bucket. Apply with `supabase db push` after a backup.
- Stripe: add `checkout.session.completed` to webhook endpoint A (the platform endpoint). It is the only new event. No new endpoint and no new secret.
- No new env vars. Checkout uses `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` (success and cancel URLs).
- `/api/payments/expire-checkouts` (every 30 minutes) also runs the ad sweep: approved to active at start, to expired at end, and unpaid checkouts older than 2 hours back to draft.
- Before launch: set real prices at `/admin/ads/pricing`. The defaults are placeholders and are labeled as such to advertisers.
- Database checks: `supabase/tests/r12_self_serve_ads.sql` (local database only; it rolls back). See `docs/ADS.md`.
