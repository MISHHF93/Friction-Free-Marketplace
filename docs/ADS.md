# Sponsored placements

Friction-Free Marketplace shows first-party sponsored units in a few fixed slots. There is no third-party ad network, no extra JavaScript tag, and no seller billing in this release. Charging sellers for promotion is a later product decision.

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

Row level security allows anyone to read campaigns that are currently live. Only `ads.manage` can write campaigns or read event totals. Ordinary members cannot insert event rows.

## Operations

- New migrations: `20261122010000_r11_ads_manage_permission.sql` and `20261122020000_r11_ads.sql`. Apply with `supabase db push` after a backup. The first file only adds the `ads.manage` enum value so the second file can use it.
- No new cron and no new environment variables.
- Content-Security-Policy is unchanged. Creatives are first-party or the existing Supabase storage host already allowed for images.
- Local RLS check: `psql "$FFM_LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/r11_ads.sql` (local database only; it rolls back).
