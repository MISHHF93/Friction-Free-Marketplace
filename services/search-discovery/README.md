# search-discovery

Fast marketplace discovery powered by **Meilisearch** and Supabase.

## Delivered capabilities

- Keyword search with typo tolerance.
- Category browsing and facet counts.
- Location radius search through Meilisearch `_geoRadius` filters.
- Price, condition, and seller-trust filters.
- Sorts for newest, closest, best value, and safest seller.
- Recommended, trending, and recently viewed listing modules.
- Saved searches with alert de-duplication.
- AI buyer intent parsing through `/api/search/intent`.

## Key files

- `schema/meilisearch-listings-index.json` — complete search schema and settings.
- `docs/indexing-strategy.md` — indexing, lifecycle, ranking, and alert design.
- `jobs/sync-and-alerts.md` — backend cron/worker contracts.
- `../../supabase/migrations/20260606002000_marketplace_discovery_system.sql` — database view, metrics, recent views, and alert tables/functions.
- `../../apps/web/lib/search/` — application Meilisearch client and fallback discovery service.
- `../../apps/web/app/api/search/` — search, intent, recommendations, trending, and sync API routes.
