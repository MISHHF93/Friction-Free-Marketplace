import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectScamMessage, detectSuspiciousPricing, scoreDuplicateImageMatch, TRUST_ENGINE_VERSION, type RiskSeverity } from "@/lib/trust-safety/engine";
import type { Json } from "@/types/database";

type Db = SupabaseClient<any>;

export type FraudRuleType =
  | "suspiciously_low_price"
  | "duplicate_title"
  | "duplicate_image_hash"
  | "new_account_expensive_item"
  | "repeated_external_payment_language"
  | "high_message_report_rate"
  | "too_many_listings_too_quickly"
  | "mismatched_category_description";

export type RuleResult = {
  type: FraudRuleType;
  score: number;
  threshold: number;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
  payload: Record<string, unknown>;
};

type ListingRiskDecision = {
  listingId: string;
  sellerId: string;
  riskScore: number;
  action: "allow" | "hold" | "block";
  blocked: boolean;
  rules: RuleResult[];
};

type ListingRow = {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  description: string;
  condition: string | null;
  status: string;
  price_amount: number | string;
  currency: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
  listing_images?: Array<{
    id: string;
    storage_path: string;
    public_url: string | null;
    alt_text: string | null;
  }>;
  categories?: { slug: string | null; name: string | null } | null;
};

const LISTING_BLOCK_THRESHOLD = 85;
const LISTING_HOLD_THRESHOLD = 70;
const SIGNAL_THRESHOLD = 45;
const MESSAGE_REPORT_RATE_THRESHOLD = 0.2;
const HIGH_VALUE_BY_CATEGORY: Record<string, number> = {
  electronics: 900,
  vehicles: 5000,
  collectibles: 750,
  fashion: 500,
  sports: 700,
  outdoors: 800,
  home: 1200,
  other: 1000
};

const categoryKeywords: Record<string, string[]> = {
  electronics: ["camera", "laptop", "phone", "tablet", "console", "lens", "drone", "headphones", "monitor", "macbook", "iphone", "sony", "canon", "nikon"],
  vehicles: ["car", "truck", "motorcycle", "scooter", "bike", "vehicle", "engine", "mileage", "tires", "title"],
  collectibles: ["vintage", "rare", "signed", "edition", "collectible", "watch", "card", "coin", "memorabilia", "authentic"],
  fashion: ["jacket", "dress", "bag", "shoes", "sneakers", "watch", "designer", "size", "leather", "denim"],
  home: ["sofa", "chair", "table", "desk", "dresser", "lamp", "rug", "cabinet", "furniture"],
  outdoors: ["tent", "kayak", "bike", "camping", "hiking", "ski", "snowboard", "fishing", "backpack"],
  sports: ["bike", "golf", "fitness", "weights", "treadmill", "helmet", "jersey", "baseball", "soccer"],
  "books-media": ["book", "vinyl", "record", "dvd", "game", "comic", "textbook", "album"],
  "baby-kids": ["stroller", "crib", "toy", "baby", "kids", "child", "car seat", "high chair"],
  services: ["repair", "cleaning", "lesson", "installation", "consulting", "service"]
};

function asAdminDb() {
  return createAdminClient() as unknown as { from(table: string): any };
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function severityFromScore(score: number): RiskSeverity {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "info";
}

export function normalizeListingTitleForFraud(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function createStableImageHash(image: { storage_path: string; public_url: string | null }) {
  return createHash("sha256").update(image.public_url || image.storage_path).digest("hex");
}

function getMetadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getCategorySlug(listing: ListingRow) {
  const metadata = getMetadataRecord(listing.metadata);
  const metadataSlug = typeof metadata.category_slug === "string" ? metadata.category_slug : null;
  return listing.categories?.slug ?? metadataSlug ?? "other";
}

export function expensiveThresholdForCategory(slug: string) {
  return HIGH_VALUE_BY_CATEGORY[slug] ?? HIGH_VALUE_BY_CATEGORY.other;
}

function getPriceSuggestion(metadata: Record<string, unknown>) {
  const suggestion = getMetadataRecord(metadata.price_suggestion);
  const max = typeof suggestion.max === "number" ? suggestion.max : null;
  const min = typeof suggestion.min === "number" ? suggestion.min : null;
  return { min, max };
}

export function combineFraudRiskScores(rules: Array<Pick<RuleResult, "score">>) {
  if (!rules.length) return 0;
  const scores = rules.map((rule) => rule.score).sort((a, b) => b - a);
  const [max, ...others] = scores;
  return clampScore(max + Math.min(100 - max, others.reduce((sum, score) => sum + score * 0.35, 0)));
}

export function calculateNewAccountExpensiveItemRule({
  accountAgeDays,
  categorySlug,
  priceAmount,
  currency
}: {
  accountAgeDays: number;
  categorySlug: string;
  priceAmount: number;
  currency: string;
}): RuleResult | null {
  const threshold = expensiveThresholdForCategory(categorySlug);
  if (accountAgeDays > 14 || priceAmount < threshold) return null;

  const score = clampScore(45 + Math.max(0, 14 - accountAgeDays) * 2 + Math.min(25, (priceAmount / threshold - 1) * 20));
  return {
    type: "new_account_expensive_item",
    score,
    threshold: 60,
    severity: severityFromScore(score),
    title: "New account posted expensive item",
    explanation: `Seller account is ${accountAgeDays.toFixed(1)} days old and listed an item at ${currency} ${priceAmount.toFixed(2)}.`,
    recommendedAction: score >= 70 ? "Hold listing until ownership, identity, or payout checks are reviewed." : "Queue seller verification prompt and monitor reports.",
    payload: { account_age_days: accountAgeDays, price_amount: priceAmount, currency, expensive_threshold: threshold, category_slug: categorySlug }
  };
}

export function calculateListingVelocityRule({ hourCount, dayCount }: { hourCount: number; dayCount: number }): RuleResult | null {
  if (hourCount < 6 && dayCount < 20) return null;

  const score = clampScore(Math.max(0, hourCount - 5) * 14 + Math.max(0, dayCount - 19) * 4 + 45);
  return {
    type: "too_many_listings_too_quickly",
    score,
    threshold: 60,
    severity: severityFromScore(score),
    title: "Too many listings too quickly",
    explanation: `Seller created ${hourCount} listing(s) in the last hour and ${dayCount} in the last day.`,
    recommendedAction: score >= 85 ? "Temporarily block publishing and require account review." : "Rate-limit publishing and route latest listings to moderation.",
    payload: { listings_last_hour: hourCount, listings_last_day: dayCount }
  };
}

export function scoreCategoryMismatchForText({
  categorySlug,
  title,
  description
}: {
  categorySlug: string;
  title: string;
  description: string;
}): RuleResult | null {
  const text = `${title} ${description}`.toLowerCase();
  const selectedHits = (categoryKeywords[categorySlug] ?? []).filter((keyword) => text.includes(keyword)).length;
  const alternate = Object.entries(categoryKeywords)
    .filter(([slug]) => slug !== categorySlug)
    .map(([slug, keywords]) => ({ slug, hits: keywords.filter((keyword) => text.includes(keyword)).length }))
    .sort((a, b) => b.hits - a.hits)[0];

  if (!alternate || alternate.hits < 2 || selectedHits >= alternate.hits) return null;

  const score = clampScore(45 + Math.min(35, (alternate.hits - selectedHits) * 10));
  return {
    type: "mismatched_category_description",
    score,
    threshold: 50,
    severity: severityFromScore(score),
    title: "Category and description mismatch",
    explanation: `Description appears closer to ${alternate.slug} than ${categorySlug}.`,
    recommendedAction: "Hold ranking until seller confirms category or moderation updates it.",
    payload: { selected_category: categorySlug, selected_hits: selectedHits, suggested_category: alternate.slug, suggested_hits: alternate.hits }
  };
}

export function calculateRepeatedExternalPaymentRule({
  messageRiskScore,
  repeatedCount,
  matchedPatterns,
  classification
}: {
  messageRiskScore: number;
  repeatedCount: number;
  matchedPatterns: string[];
  classification: string;
}): RuleResult | null {
  if (classification !== "off_platform_payment" || repeatedCount < 2) return null;

  const score = clampScore(Math.max(70, messageRiskScore + Math.min(20, repeatedCount * 5)));
  return {
    type: "repeated_external_payment_language",
    score,
    threshold: 70,
    severity: severityFromScore(score),
    title: "Repeated external payment language",
    explanation: `User has ${repeatedCount} off-platform payment message detection(s) in the last 7 days.`,
    recommendedAction: score >= 85 ? "Block message and queue account for fraud review." : "Hold message for moderation and warn the sender.",
    payload: { matched_patterns: matchedPatterns, classification, detections_last_7_days: repeatedCount, message_risk_score: messageRiskScore }
  };
}

export function calculateMessageReportRateRule({ reportCount, messageCount }: { reportCount: number; messageCount: number }): RuleResult | null {
  const boundedMessageCount = Math.max(1, messageCount);
  const reportRate = reportCount / boundedMessageCount;
  if (reportCount < 3 || reportRate < MESSAGE_REPORT_RATE_THRESHOLD) return null;

  const score = clampScore(45 + reportCount * 8 + reportRate * 100);
  return {
    type: "high_message_report_rate",
    score,
    threshold: 65,
    severity: severityFromScore(score),
    title: "High message report rate",
    explanation: `${reportCount} message report(s) across ${boundedMessageCount} sent message(s) in the last 7 days.`,
    recommendedAction: score >= 85 ? "Restrict messaging and route account to fraud review." : "Queue conversation samples for safety review.",
    payload: { reports_last_7_days: reportCount, messages_last_7_days: boundedMessageCount, report_rate: reportRate }
  };
}

async function safeInsert(table: string, payload: Record<string, unknown>) {
  try {
    const db = asAdminDb();
    return await db.from(table).insert(payload).select("id").single();
  } catch (error) {
    console.error(`Unable to insert ${table}`, error);
    return { data: null, error };
  }
}

async function recordSignalForRule(rule: RuleResult, subject: { userId?: string | null; listingId?: string | null; transactionId?: string | null; messageId?: string | null }) {
  if (rule.score < SIGNAL_THRESHOLD) return null;

  const signal = await safeInsert("fraud_signals", {
    user_id: subject.userId ?? null,
    listing_id: subject.listingId ?? null,
    transaction_id: subject.transactionId ?? null,
    signal_type: rule.type,
    risk_score: rule.score,
    source: `fraud-detection-v1:${rule.type}`,
    payload: {
      ...rule.payload,
      message_id: subject.messageId ?? null,
      title: rule.title,
      explanation: rule.explanation,
      recommended_action: rule.recommendedAction,
      severity: rule.severity,
      detector_version: TRUST_ENGINE_VERSION
    }
  });

  if (rule.score >= LISTING_HOLD_THRESHOLD) {
    await safeInsert("automated_risk_flags", {
      user_id: subject.userId ?? null,
      listing_id: subject.listingId ?? null,
      message_id: subject.messageId ?? null,
      transaction_id: subject.transactionId ?? null,
      signal_id: signal.data?.id ?? null,
      flag_type: rule.type,
      severity: rule.severity,
      status: rule.score >= LISTING_BLOCK_THRESHOLD ? "auto_contained" : "open",
      score: rule.score,
      threshold: rule.threshold,
      title: rule.title,
      explanation: rule.explanation,
      recommended_action: rule.recommendedAction,
      detector_version: TRUST_ENGINE_VERSION,
      evidence: rule.payload
    });
  }

  return signal.data;
}

async function getListingForFraud(listingId: string): Promise<ListingRow | null> {
  const db = asAdminDb();
  const { data, error } = await db
    .from("listings")
    .select("id,seller_id,category_id,title,description,condition,status,price_amount,currency,metadata,created_at,published_at,categories(slug,name),listing_images(id,storage_path,public_url,alt_text)")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Unable to load listing for fraud scoring", { listingId, error });
    return null;
  }

  return data as ListingRow;
}

async function scoreSuspiciousPrice(listing: ListingRow): Promise<RuleResult | null> {
  const db = asAdminDb();
  const metadata = getMetadataRecord(listing.metadata);
  const priceAmount = Number(listing.price_amount);
  const { data: baseline } = await db
    .from("pricing_baselines")
    .select("median_price,p10_price,p90_price,sample_size,source")
    .eq("category_id", listing.category_id)
    .eq("currency", listing.currency)
    .eq("condition", listing.condition)
    .maybeSingle();
  const fallbackSuggestion = getPriceSuggestion(metadata);
  const categoryMedian = baseline ? Number(baseline.median_price) : fallbackSuggestion.max;
  const categoryP10 = baseline ? Number(baseline.p10_price) : fallbackSuggestion.min;
  const risk = detectSuspiciousPricing({
    listingId: listing.id,
    priceAmount,
    currency: listing.currency,
    categoryMedian,
    categoryP10,
    categoryP90: baseline ? Number(baseline.p90_price) : null
  });

  if (risk.score < 45) return null;

  return {
    type: "suspiciously_low_price",
    score: risk.score,
    threshold: 45,
    severity: risk.severity,
    title: risk.title,
    explanation: risk.explanation,
    recommendedAction: risk.recommendedAction,
    payload: { price_amount: priceAmount, currency: listing.currency, baseline: baseline ?? null, price_suggestion: fallbackSuggestion, under_median_ratio: risk.underMedianRatio }
  };
}

async function scoreDuplicateTitle(listing: ListingRow): Promise<RuleResult | null> {
  const db = asAdminDb();
  const normalizedTitle = normalizeListingTitleForFraud(listing.title);
  const { data } = await db
    .from("listings")
    .select("id,title,seller_id,status,created_at")
    .neq("id", listing.id)
    .is("deleted_at", null)
    .limit(100);
  const matches = (data ?? []).filter((row: { title: string }) => normalizeListingTitleForFraud(row.title) === normalizedTitle);
  if (!matches.length) return null;

  const crossSellerMatches = matches.filter((row: { seller_id: string }) => row.seller_id !== listing.seller_id);
  const score = crossSellerMatches.length > 0 ? 78 : 55;

  return {
    type: "duplicate_title",
    score,
    threshold: 50,
    severity: severityFromScore(score),
    title: crossSellerMatches.length > 0 ? "Duplicate title across sellers" : "Repeated listing title",
    explanation: `Found ${matches.length} existing listing title match${matches.length === 1 ? "" : "es"}.`,
    recommendedAction: crossSellerMatches.length > 0 ? "Hold listing for originality and seller history review." : "Ask seller to clarify whether this is a duplicate or relist.",
    payload: { normalized_title: normalizedTitle, matches: matches.slice(0, 5) }
  };
}

async function scoreDuplicateImageHash(listing: ListingRow): Promise<RuleResult | null> {
  const images = listing.listing_images ?? [];
  if (!images.length) return null;

  const db = asAdminDb();
  const matches: Array<Record<string, unknown>> = [];

  for (const image of images) {
    const perceptualHash = createStableImageHash(image);
    await db.from("listing_image_fingerprints").upsert({
      listing_image_id: image.id,
      listing_id: listing.id,
      seller_id: listing.seller_id,
      perceptual_hash: perceptualHash,
      source: "fraud-detection-v1",
      metadata: { storage_path: image.storage_path, public_url: image.public_url }
    }, { onConflict: "listing_image_id" });

    const { data } = await db
      .from("listing_image_fingerprints")
      .select("listing_image_id,listing_id,seller_id,perceptual_hash,created_at")
      .eq("perceptual_hash", perceptualHash)
      .neq("listing_id", listing.id)
      .limit(10);

    for (const match of data ?? []) {
      matches.push({ ...match, current_listing_image_id: image.id });
      await db.from("duplicate_image_matches").insert({
        listing_image_id: image.id,
        matched_listing_image_id: match.listing_image_id,
        listing_id: listing.id,
        matched_listing_id: match.listing_id,
        similarity: 100,
        match_type: "exact_hash",
        evidence: { perceptual_hash: perceptualHash, source: "fraud-detection-v1" }
      });
    }
  }

  if (!matches.length) return null;

  const crossSeller = matches.some((match) => match.seller_id !== listing.seller_id);
  const risk = scoreDuplicateImageMatch(100, crossSeller, true);

  return {
    type: "duplicate_image_hash",
    score: risk.score,
    threshold: 75,
    severity: risk.severity,
    title: risk.title,
    explanation: risk.explanation,
    recommendedAction: risk.recommendedAction,
    payload: { matches: matches.slice(0, 10), match_count: matches.length, cross_seller: crossSeller }
  };
}

async function scoreNewAccountExpensiveItem(listing: ListingRow): Promise<RuleResult | null> {
  const db = asAdminDb();
  const { data: seller } = await db.from("users").select("id,created_at").eq("id", listing.seller_id).maybeSingle();
  if (!seller?.created_at) return null;

  const accountAgeDays = (Date.now() - new Date(seller.created_at).getTime()) / 86_400_000;
  const categorySlug = getCategorySlug(listing);
  const priceAmount = Number(listing.price_amount);
  return calculateNewAccountExpensiveItemRule({ accountAgeDays, categorySlug, priceAmount, currency: listing.currency });
}

async function scoreListingVelocity(listing: ListingRow): Promise<RuleResult | null> {
  const db = asAdminDb();
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [hour, day] = await Promise.all([
    db.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", listing.seller_id).gte("created_at", sinceHour),
    db.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", listing.seller_id).gte("created_at", sinceDay)
  ]);
  const hourCount = hour.count ?? 0;
  const dayCount = day.count ?? 0;

  return calculateListingVelocityRule({ hourCount, dayCount });
}

function scoreCategoryMismatch(listing: ListingRow): RuleResult | null {
  return scoreCategoryMismatchForText({ categorySlug: getCategorySlug(listing), title: listing.title, description: listing.description });
}

async function collectListingRules(listing: ListingRow) {
  const rules = await Promise.all([
    scoreSuspiciousPrice(listing),
    scoreDuplicateTitle(listing),
    scoreDuplicateImageHash(listing),
    scoreNewAccountExpensiveItem(listing),
    scoreListingVelocity(listing)
  ]);
  const categoryMismatch = scoreCategoryMismatch(listing);
  return [...rules, categoryMismatch].filter((rule): rule is RuleResult => !!rule);
}

async function applyListingDecision(listing: ListingRow, decision: ListingRiskDecision) {
  const db = asAdminDb();
  const metadata = getMetadataRecord(listing.metadata);
  const existingModerationStatus = typeof metadata.moderation_status === "string" ? metadata.moderation_status : "pending";
  const existingModerationNotes = typeof metadata.moderation_notes === "string" ? metadata.moderation_notes : null;
  const fraudDetection = {
    risk_score: decision.riskScore,
    action: decision.action,
    blocked: decision.blocked,
    rules: decision.rules.map((rule) => ({ type: rule.type, score: rule.score, severity: rule.severity })),
    scored_at: new Date().toISOString(),
    detector_version: TRUST_ENGINE_VERSION
  };

  const nextMetadata = {
    ...metadata,
    fraud_detection: fraudDetection,
    moderation_status: decision.blocked || decision.action === "hold" ? "needs_review" : existingModerationStatus,
    moderation_notes: decision.blocked ? "Blocked by fraud detection v1 pending admin review." : existingModerationNotes
  } satisfies Json;

  if (decision.blocked) {
    await db.from("listings").update({ status: "draft", published_at: null, metadata: nextMetadata }).eq("id", listing.id);
  } else {
    await db.from("listings").update({ metadata: nextMetadata }).eq("id", listing.id);
  }
}

export async function evaluateListingFraud(listingId: string): Promise<ListingRiskDecision | null> {
  try {
    const listing = await getListingForFraud(listingId);
    if (!listing) return null;

    const rules = await collectListingRules(listing);
    const riskScore = combineFraudRiskScores(rules);
    const action = riskScore >= LISTING_BLOCK_THRESHOLD ? "block" : riskScore >= LISTING_HOLD_THRESHOLD ? "hold" : "allow";
    const decision: ListingRiskDecision = {
      listingId: listing.id,
      sellerId: listing.seller_id,
      riskScore,
      action,
      blocked: action === "block",
      rules
    };

    await Promise.all(rules.map((rule) => recordSignalForRule(rule, { userId: listing.seller_id, listingId: listing.id })));
    await applyListingDecision(listing, decision);
    return decision;
  } catch (error) {
    console.error("Fraud listing evaluation failed", { listingId, error });
    return null;
  }
}

export async function evaluateMessageFraud(messageId: string) {
  try {
    const db = asAdminDb();
    const { data: message, error } = await db.from("messages").select("id,conversation_id,sender_id,body,created_at").eq("id", messageId).maybeSingle();
    if (error || !message) return null;

    const risk = detectScamMessage(String(message.body));
    await db.from("scam_message_detections").upsert({
      message_id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      risk_score: risk.score,
      matched_patterns: risk.matchedPatterns,
      classification: risk.classification,
      action: risk.action,
      explanation: risk.explanation,
      detector_version: "fraud-detection-v1",
      metadata: { source: "message_send" }
    }, { onConflict: "message_id" });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: repeatedCount } = await db
      .from("scam_message_detections")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", message.sender_id)
      .eq("classification", "off_platform_payment")
      .gte("created_at", weekAgo);

    const repeatedRule = calculateRepeatedExternalPaymentRule({
      messageRiskScore: risk.score,
      repeatedCount: repeatedCount ?? 0,
      matchedPatterns: risk.matchedPatterns,
      classification: risk.classification
    });
    if (repeatedRule) {
      const rule = repeatedRule;
      await recordSignalForRule(rule, { userId: message.sender_id, messageId: message.id });
    }

    const moderationStatus = risk.action === "block" || repeatedRule && (repeatedCount ?? 0) >= 4 ? "removed" : risk.score >= 55 ? "flagged" : "approved";
    await db.from("messages").update({ moderation_status: moderationStatus }).eq("id", message.id);
    return { risk, repeatedExternalPaymentCount: repeatedCount ?? 0, moderationStatus };
  } catch (error) {
    console.error("Fraud message evaluation failed", { messageId, error });
    return null;
  }
}

export async function evaluateMessageReportRate(reportedUserId: string) {
  try {
    const db = asAdminDb();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [reports, messages] = await Promise.all([
      db.from("reports").select("id", { count: "exact", head: true }).eq("reported_user_id", reportedUserId).eq("reason", "message").gte("created_at", weekAgo),
      db.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", reportedUserId).gte("created_at", weekAgo)
    ]);
    const rule = calculateMessageReportRateRule({ reportCount: reports.count ?? 0, messageCount: messages.count ?? 0 });
    if (!rule) return null;
    await recordSignalForRule(rule, { userId: reportedUserId });
    return rule;
  } catch (error) {
    console.error("Fraud report-rate evaluation failed", { reportedUserId, error });
    return null;
  }
}
