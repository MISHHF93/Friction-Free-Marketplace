# Marketplace discovery indexing strategy

## Engine

Use **Meilisearch** as the primary discovery engine because it supports typo-tolerant keyword search, facets, numeric filters, sortable ranking, and `_geoRadius` / `_geoPoint` location queries with a small operational footprint.

## Source of truth

Postgres remains the system of record. The `public.listing_search_documents` view flattens listings, category metadata, seller profile, trust scores, listing media, and engagement metrics into one Meilisearch document.

## Document lifecycle

1. Listing is created or updated in Postgres.
2. Listing media, seller trust, and discovery stats update asynchronously.
3. Listing lifecycle writes call `syncListingToSearch(listingId)` for immediate single-document upsert/delete.
4. `POST /api/search/sync` runs from a cron, queue worker, or deployment job with `SEARCH_SYNC_SECRET`.
5. The sync route configures index settings and upserts active rows from `listing_search_documents` into the `listings` index.
6. Removed, sold, archived, paused, or fraud-blocked listings are deleted from Meilisearch with delete-batch.

## API layer

- `GET /api/search`: keyword search with filters, facets, sorting, pagination, and search-event tracking.
- `POST /api/search`: same contract as GET for richer clients and AI-generated intent payloads.
- `GET /api/search/recommendations`: personalized recommendations using recent views, favorites, and saved-search seeds when signed in.
- `GET /api/search/trending`: trending listings ranked by `trend_score`, freshness, saves, views, and seller safety.
- `POST /api/search/sync`: operational indexing endpoint.

`/api/search/sync` accepts:

- `{ "mode": "configure" }` to create/update the index and settings.
- `{ "mode": "listing", "listingId": "<uuid>" }` to sync one listing.
- `{ "mode": "listing", "listingId": "<uuid>", "remove": true }` to delete one document.
- `{ "mode": "batch", "listingIds": ["<uuid>"], "wait": true }` to sync specific listings.
- `{ "mode": "rebuild", "limit": 1000, "wait": true }` to rebuild active inventory.

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

## Document fields

`listing_search_documents` flattens listing, seller, trust, media, and engagement data. Meilisearch indexes:

- Searchable text: `title`, `description`, `category_name`, `category_slug`, `seller_display_name`, `seo_tags`, `attributes`, `search_terms`, and location labels.
- Filters: status, category, condition, currency, price, seller trust, fraud risk, fulfillment modes, shipping destinations, location, engagement scores, and `_geo`.
- Sorts: recency, price, seller trust, completed transactions, views, saves, trend, value, safety, conversion, and distance.

## Alerts

Saved searches are stored in `public.saved_searches`. `public.enqueue_saved_search_alerts_for_listing(listing_id)` evaluates newly active listings against saved query/filter JSON, creates `notifications`, and records de-duplication rows in `saved_search_alert_deliveries`.
