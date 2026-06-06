# Marketplace discovery indexing strategy

## Engine

Use **Meilisearch** as the primary discovery engine because it supports typo-tolerant keyword search, facets, numeric filters, sortable ranking, and `_geoRadius` / `_geoPoint` location queries with a small operational footprint.

## Source of truth

Postgres remains the system of record. The `public.listing_search_documents` view flattens listings, category metadata, seller profile, trust scores, listing media, and engagement metrics into one Meilisearch document.

## Document lifecycle

1. Listing is created or updated in Postgres.
2. Listing media, seller trust, and discovery stats update asynchronously.
3. `POST /api/search/sync` runs from a cron/queue worker with `SEARCH_SYNC_SECRET`.
4. The sync route configures index settings and upserts active rows from `listing_search_documents` into the `marketplace_listings` index.
5. Removed, sold, or paused listings should be deleted or soft-hidden from the index by sending document IDs to Meilisearch delete-batch.

## Ranking

Default relevance uses Meilisearch text ranking and then marketplace quality signals:

- `safety_score`: seller trust minus fraud risk penalties.
- `value_score`: price advantage plus seller quality.
- `trend_score`: recency-adjusted views and saves.
- `published_at`: newest inventory tie-breaker.

Dedicated sorts map to explicit sortable attributes:

- Newest: `published_at:desc`.
- Closest: `_geoPoint(lat,lng):asc` with `_geoRadius` filter.
- Best value: `value_score:desc`.
- Safest seller: `safety_score:desc` and `seller_trust_score:desc`.
- Recommended: `conversion_score:desc`, `safety_score:desc`.
- Trending: `trend_score:desc`.

## Alerts

Saved searches are stored in `public.saved_searches`. `public.enqueue_saved_search_alerts_for_listing(listing_id)` evaluates newly active listings against saved query/filter JSON, creates `notifications`, and records de-duplication rows in `saved_search_alert_deliveries`.
