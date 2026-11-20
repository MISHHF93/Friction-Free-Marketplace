# Friction Free Marketplace roadmap

Production repo: `garfieldgarwood45-collab/FrictionFree-production`. It deploys to frictionfree.co through Vercel.
Source audit: `ffm-reviews/r10-lifecycle-audit.md` (r10, Nov 20, 2026). The IDs below (P0-1 and so on) refer to that audit.
Items tagged **$**, **RLS** or **MIG** touch money logic, row-level security or migrations. They need explicit sign-off before work starts.

## Now (this week): make launch safe

| Item | Audit IDs | Tags | Owner |
|---|---|---|---|
| Go-live prerequisites: production env vars, `supabase db push`, Stripe webhooks, Auth URLs, PITR backups | ops (LAUNCH.md) | ops | |
| Decide on the cron host for Garfield's Vercel plan (Pro, or Supabase pg_cron) | P0-2 | ops | |
| Expire abandoned checkouts so listings don't stay locked | P0-1 | $ | |
| Block account deletion while orders or escrow are open | P0-5 | $, MIG | |
| Listing moderation guard (trigger and server-only moderation status) | P0-3, P1-7, P1-11 | RLS, MIG | |
| Enforce suspended and banned status, and expire restrictions | P0-4 | RLS, MIG | |
| Merge the duplicate release paths (partial-refund cap) | P1-4 | $ | |
| Error monitoring and uptime checks, and restore CI workflows in the prod repo | P1-15 | ops | |

## Next (2–4 weeks): complete the lifecycle

| Item | Audit IDs | Tags | Owner |
|---|---|---|---|
| Seller "accept by" notice, capture deadline on Sales, 48h reminder and 72h auto-cancel | P1-1 | $ | |
| Notifications for shipped, delivered, auto-released, refunded, dispute resolved and payout | P1-2, P1-13 | | |
| Remove duplicate message and offer notifications | P1-3 | MIG | |
| Local pickup handoff flow | P1-5 | $ | |
| Require Stripe Connect before publishing (or hide Buy) | P1-6 | | |
| Dispute evidence and response, and admin "request info" | P1-9, P1-14 | $ | |
| Close offers when the listing becomes unavailable, and expire unpaid accepted offers | P1-10, P2-13 | MIG | |
| One shared status vocabulary (`lib/status.ts`) for UI and API | P1-8, P2-9 | | |
| Remove the legacy `database/migrations` tree | P1-12 | | |

## Later

| Item | Audit IDs | Tags | Owner |
|---|---|---|---|
| Unified moderation case queue with reporter notifications | P2-10 | MIG | |
| Accurate payout tracking (transfer to bank payout) | P2-6 | $ | |
| Listing expiry and renewal | P2-1 | MIG | |
| Drop unused tables and enum values | P2-2, P2-3, P2-5 | MIG | |
| Build-time guard against dev and test flags in production | P2-11 | | |
| Repo cleanup: empty apps, unused services, aspirational docs | P2-7, P2-8, P2-12 | | |
| Mobile app (Capacitor) release track | n/a | | |
