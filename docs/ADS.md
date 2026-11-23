# Sponsored placements

Friction-Free Marketplace shows first-party sponsored units in a few fixed slots. There is no third-party ad network and no extra JavaScript tag. Campaigns come from two sources: house campaigns that admins create (r11), and paid self-serve ads that any signed-in member or business buys (r12, see below).

## Slots

| Key | Where it appears |
| --- | --- |
| `home_top_banner` | Home, under the hero |
| `home_inline` | Home, between categories and latest listings |
| `search_inline` | Search and browse results, every 8 listings |
| `category_top` | Top of a category page |
| `listing_detail_below` | Listing detail, below the description |
| `dashboard_card` | Signed-in dashboard overview |

If a slot has no eligible campaign, the page renders nothing there. No empty frame or reserved gap is left behind.

## Eligibility

A campaign is eligible when all of these are true:

- `status` is `approved` or `active` (house campaigns default to `approved`)
- `is_active` is true
- `starts_at` is in the past
- `ends_at` is empty or still in the future
- `category_slug` is empty, or it matches the page category

When more than one campaign is eligible for the same slot, the highest `priority` wins. Campaigns that share that priority rotate by `weight`.

## Public rendering

`AdSlot` is a server component. It always shows a visible "Sponsored" label, uses `next/image` in a fixed aspect-ratio box to avoid layout shift, and lazy-loads units that sit below the fold. Outbound links use `rel="sponsored noopener"`. Clicks go to `/api/ads/click/[id]`, which counts the click and then redirects only to an internal path or an `https` URL. Open redirects (`//host`, backslashes, credentials, `javascript:`, plain `http`) are rejected.

Impression and click counts are stored as daily totals on `ad_events`. Those rows have no user or IP data. Inserts happen only through the rate-limited `/api/ads/impression/[id]` and `/api/ads/click/[id]` routes, which call `increment_ad_event` as the service role.

## Admin

`/admin/ads` is limited to the `ads.manage` permission, which is granted to the `admin` and `super_admin` roles. Operators can list campaigns, upload a creative to the public `ad-creatives` storage bucket, preview it, schedule a window, pause or resume, and see impressions, clicks, and CTR. Writes are recorded in `audit_logs`.

Row level security allows anyone to read campaigns that are approved and currently live. Advertisers can also read their own campaigns in any state and their own event totals. Only `ads.manage` can write campaigns, edit pricing, or read every event total. Ordinary members cannot insert campaigns or event rows. `increment_ad_event` ignores campaigns that are not `approved` or `active`.

## Operations

- New migrations: `20261122010000_r11_ads_manage_permission.sql` and `20261122020000_r11_ads.sql`. Apply with `supabase db push` after a backup. The first file only adds the `ads.manage` enum value so the second file can use it.
- No new cron and no new environment variables (r11 and r12).
- Content-Security-Policy is unchanged. Creatives are first-party or the existing Supabase storage host already allowed for images.
- Local RLS check: `psql "$FFM_LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r11_ads.sql` (local database only; it rolls back).

## Self-serve paid ads (r12)

### Advertiser flow

1. `/advertise` (sign-in required). The advertiser picks a placement (home, search, category, listing or dashboard), uploads a JPG, PNG or WebP up to 2 MB, and sets a headline, a display name, an `https://` link, an optional image description, a start date and a run length (1, 3, 7, 14 or 30 days, bounded by the placement's min and max days).
2. The review step shows a "Sponsored" preview, the price per day, the number of days and the total. "Pay with Stripe" calls `POST /api/ads/checkout` (Idempotency-Key required, 10 attempts per 10 minutes per user). The server prices the ad from `ad_pricing`, never from the client. It saves the ad and redirects to a Stripe Checkout page (card only, expires after 60 minutes).
3. Stripe returns to `/dashboard/ads?checkout=success` or `?checkout=cancelled`. "My ads" lists every ad with its status, dates, price, impressions, clicks and CTR, plus a "Finish payment" button for unpaid ads. That button reuses the open Checkout session, or re-prices and opens a new one if the old one expired.

Creatives upload through `POST /api/uploads/advertiser-creative` to `advertisers/<user id>/<uuid>.<ext>` in the public `ad-creatives` bucket (20 uploads per hour per user). Checkout rejects any image path outside the advertiser's own folder. The bucket is public, so an unapproved creative can be fetched by anyone who knows its random path. It is never placed on a page until it is approved.

### Lifecycle

| Status | Meaning | Serves? |
| --- | --- | --- |
| `draft` | Saved, checkout not started, or checkout abandoned for over 2 hours | No |
| `pending_payment` | Stripe Checkout session open | No |
| `paid_pending_review` | `checkout.session.completed` received; waiting for an admin | No |
| `approved` | Approved, start date in the future | From `starts_at` |
| `active` | Approved and running | Yes, until `ends_at` |
| `rejected` | Rejected with a reason; full refund issued | No |
| `expired` | Past `ends_at` | No |

- Approving a paid ad whose start date has already passed moves the start to now, so the advertiser still gets every paid day.
- Rejecting requires a reason (up to 500 characters). It refunds the full amount with a Stripe refund (idempotency key `ad-reject-refund:<id>`) before the status changes. If Stripe refuses, the ad stays in review and the admin sees an error.
- The advertiser gets an in-app notification and an email through the normal notification path (topic `payments`) when payment is received (`ad_payment_received`), on approval (`ad_approved`) and on rejection (`ad_rejected`, with the reason).
- A second paid Checkout for an ad that is already paid is refunded automatically (`ad-duplicate-refund:<payment_intent>`).
- The sweep `advance_ad_campaign_lifecycle()` runs inside the existing `/api/payments/expire-checkouts` cron (every 30 minutes). It moves `approved` to `active`, past-end ads to `expired`, and stale `pending_payment` back to `draft`. Ads stop serving at `ends_at` even before the sweep runs, because the serving query and RLS check the window.

### Stripe

- A normal platform charge with Checkout `mode: payment`. No `transfer_data`, no application fee, and no Connect account. The PaymentIntent metadata carries `kind=ad_campaign` and `ad_campaign_id`, and never `transaction_id`, so the escrow handlers ignore it.
- One new webhook event on the existing platform endpoint `/api/stripe/webhooks`: `checkout.session.completed`. The handler checks `metadata.kind`, `payment_status = paid`, and that the amount and currency match the saved price, and it is idempotent. The `charge.refunded` event for an ad refund finds no escrow payment and is a no-op.
- No new environment variables.

### Pricing

`ad_pricing` holds one row per placement: `price_cents_per_day`, `currency`, `min_days`, `max_days`, `self_serve_enabled` and `is_placeholder`. Admins edit it at `/admin/ads/pricing`, and saving a row clears `is_placeholder`. Ads that are already paid keep the price they paid.

Placeholder defaults. These are not final prices; set real ones before launch:

| Placement | Placeholder per day |
| --- | --- |
| `home_top_banner` | USD 20.00 |
| `home_inline` | USD 15.00 |
| `search_inline` | USD 15.00 |
| `category_top` | USD 10.00 |
| `listing_detail_below` | USD 8.00 |
| `dashboard_card` | USD 5.00 |

All placements default to 1 to 30 days. While any price is a placeholder, the advertise form says so and `/admin/ads/pricing` shows a warning.

### Admin review

`/admin/ads` shows "Awaiting review" at the top, with the creative, placement, dates, link and amount paid, plus Approve and "Reject and refund" (reason required). The campaign list labels each row as House or Self-serve, with its status. Every review and pricing change is written to `audit_logs`.

### Operations

- Migration: `20261123000000_r12_self_serve_ads.sql`. It only adds things: columns with safe defaults, a new table, and replaced policies and functions. Apply with `supabase db push` after a backup.
- Local check: `psql "$FFM_LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r12_self_serve_ads.sql` (local database only; it rolls back).
