# Backend sync jobs

## Configure and sync Meilisearch

Run every 1-5 minutes, or immediately after a publish event:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/search/sync" \
  -H "Authorization: Bearer $SEARCH_SYNC_SECRET"
```

Required environment:

- `MEILISEARCH_HOST`
- `MEILISEARCH_API_KEY`
- `SEARCH_SYNC_SECRET`
- Supabase service credentials

## Saved search alert job

When a listing transitions to `active`, call the database function:

```sql
select public.enqueue_saved_search_alerts_for_listing('<listing-id>'::uuid);
```

The function filters by keyword, category, price, condition, and minimum seller trust. It writes in-app notifications and de-duplicates each saved-search/listing pair.

## Engagement job

Call `public.increment_listing_view(listing_id, viewer_id, context)` from listing-detail views to maintain recent views and trend scores. Batch recompute `value_score`, `safety_score`, and `conversion_score` daily from marketplace intelligence and trust-safety signals.
