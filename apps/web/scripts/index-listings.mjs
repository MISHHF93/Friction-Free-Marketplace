#!/usr/bin/env node
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MEILISEARCH_HOST", "MEILISEARCH_API_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const indexUid = process.env.MEILISEARCH_LISTINGS_INDEX || "listings";
const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "1000");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const meiliHost = process.env.MEILISEARCH_HOST.replace(/\/$/, "");

const searchableAttributes = ["title", "description", "category_name", "category_slug", "condition", "seller_display_name", "seo_tags", "attributes", "location_label", "location_city", "location_region"];
const filterableAttributes = ["status", "category_id", "category_slug", "condition", "currency", "price_amount", "seller_trust_score", "seller_completed_transactions", "seller_fraud_risk_level", "pickup_available", "ships_to", "location_city", "location_region", "location_country", "published_at", "created_at", "saved_count", "view_count", "conversion_score", "safety_score", "trend_score", "value_score", "_geo"];
const sortableAttributes = ["published_at", "created_at", "updated_at", "price_amount", "seller_trust_score", "seller_completed_transactions", "view_count", "saved_count", "trend_score", "value_score", "safety_score", "conversion_score", "_geo"];
const rankingRules = ["words", "typo", "proximity", "attribute", "sort", "exactness", "desc(safety_score)", "desc(seller_trust_score)", "desc(value_score)", "desc(trend_score)", "desc(published_at)"];

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} failed (${response.status}): ${await response.text()}`);
  if (response.status === 204) return undefined;
  return response.json();
}

function meili(path, options = {}) {
  return request(`${meiliHost}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MEILISEARCH_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
}

function supabase(path) {
  return request(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
}

function toDocument(row) {
  const latitude = Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null;
  const longitude = Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null;
  const document = {
    ...row,
    price_amount: Number(row.price_amount ?? 0),
    seller_trust_score: Number(row.seller_trust_score ?? 0),
    seller_completed_transactions: Number(row.seller_completed_transactions ?? 0),
    view_count: Number(row.view_count ?? 0),
    saved_count: Number(row.saved_count ?? 0),
    purchase_count: Number(row.purchase_count ?? 0),
    trend_score: Number(row.trend_score ?? 0),
    value_score: Number(row.value_score ?? 0),
    safety_score: Number(row.safety_score ?? 0),
    conversion_score: Number(row.conversion_score ?? 0),
    latitude,
    longitude
  };
  if (latitude !== null && longitude !== null) document._geo = { lat: latitude, lng: longitude };
  return document;
}

await meili(`/indexes/${indexUid}`, { method: "PUT", body: JSON.stringify({ uid: indexUid, primaryKey: "id" }) });
await meili(`/indexes/${indexUid}/settings`, {
  method: "PATCH",
  body: JSON.stringify({
    searchableAttributes,
    filterableAttributes,
    sortableAttributes,
    rankingRules,
    typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    faceting: { maxValuesPerFacet: 100 },
    pagination: { maxTotalHits: 5000 }
  })
});

const rows = await supabase(`listing_search_documents?status=eq.active&select=*&order=updated_at.desc&limit=${limit}`);
const documents = rows.map(toDocument);
const task = documents.length
  ? await meili(`/indexes/${indexUid}/documents`, { method: "POST", body: JSON.stringify(documents) })
  : { taskUid: null };

console.log(JSON.stringify({ indexUid, indexed: documents.length, task }, null, 2));
