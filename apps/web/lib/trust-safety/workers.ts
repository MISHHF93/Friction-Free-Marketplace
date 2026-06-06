import { createAdminClient } from "@/lib/supabase/admin";
import {
  TRUST_ENGINE_VERSION,
  calculateTrustScores,
  detectScamMessage,
  detectSuspiciousPricing,
  scoreDuplicateImageMatch,
  type TrustScoreInputs,
  type VerificationCheck
} from "@/lib/trust-safety/engine";

type AdminSupabase = ReturnType<typeof createAdminClient>;

type WorkerRunResult = {
  worker: string;
  processed: number;
  flagged: number;
  warnings: string[];
};

function asAdminDb(supabase: AdminSupabase) {
  return supabase as unknown as {
    from(table: string): any;
    rpc(fn: string, args?: Record<string, unknown>): any;
  };
}

export async function runTrustScoreWorker(limit = 100): Promise<WorkerRunResult> {
  const db = asAdminDb(createAdminClient());
  const warnings: string[] = [];
  const { data: users, error } = await db.from("users").select("id").is("deleted_at", null).limit(limit);

  if (error) throw new Error(error.message);

  let processed = 0;
  for (const user of users ?? []) {
    const userId = String(user.id);
    const [{ data: checks }, { data: reviews }, { data: transactions }, { data: disputes }, { data: flags }] = await Promise.all([
      db.from("user_verification_checks").select("check_type,status,confidence_score,expires_at").eq("user_id", userId),
      db.from("reviews").select("rating").eq("reviewee_id", userId).eq("status", "published").eq("is_public", true),
      db.from("transactions").select("id,status,buyer_id,seller_id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      db.from("disputes").select("id,transactions!inner(buyer_id,seller_id)").or(`transactions.buyer_id.eq.${userId},transactions.seller_id.eq.${userId}`),
      db.from("automated_risk_flags").select("status").eq("user_id", userId)
    ]);

    const verificationChecks: VerificationCheck[] = (checks ?? []).map((check: any) => ({
      checkType: check.check_type,
      status: check.status,
      confidenceScore: check.confidence_score,
      expiresAt: check.expires_at
    }));
    const ratings = (reviews ?? []).map((review: { rating: number }) => review.rating);
    const completedTransactions = (transactions ?? []).filter((transaction: { status: string }) => transaction.status === "completed").length;
    const openDisputes = (disputes ?? []).length;
    const confirmedRiskFlags = (flags ?? []).filter((flag: { status: string }) => flag.status === "confirmed").length;
    const openRiskFlags = (flags ?? []).filter((flag: { status: string }) => ["open", "auto_contained", "in_review"].includes(flag.status)).length;

    const inputs: TrustScoreInputs = {
      verificationChecks,
      averageRating: ratings.length ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : 0,
      reviewCount: ratings.length,
      completedTransactions,
      disputesOpened: openDisputes,
      confirmedRiskFlags,
      openRiskFlags
    };
    const result = calculateTrustScores(inputs);

    const { error: upsertError } = await db.from("trust_scores").upsert({
      user_id: userId,
      score: result.overallScore,
      seller_score: result.sellerScore,
      buyer_score: result.buyerReliabilityScore,
      review_count: inputs.reviewCount,
      completed_transactions: completedTransactions,
      dispute_rate: result.disputeRate,
      fraud_risk_level: result.fraudRiskLevel,
      computed_at: new Date().toISOString(),
      model_version: result.formulaVersion,
      signals: {
        identity_points: result.identityPoints,
        formula_version: result.formulaVersion,
        badges: result.badges.map((badge) => badge.code)
      },
      updated_at: new Date().toISOString()
    });

    if (upsertError) warnings.push(`Trust score upsert failed for ${userId}: ${upsertError.message}`);

    if (result.badges.length) {
      const { error: badgeError } = await db.from("user_trust_badges").upsert(
        result.badges.map((badge) => ({
          user_id: userId,
          code: badge.code,
          label: badge.label,
          description: badge.description,
          level: badge.level,
          icon: badge.icon,
          visibility: "public",
          metadata: { formula_version: result.formulaVersion }
        })),
        { onConflict: "user_id,code" }
      );
      if (badgeError) warnings.push(`Badge upsert failed for ${userId}: ${badgeError.message}`);
    }

    processed += 1;
  }

  return { worker: "trust-score", processed, flagged: 0, warnings };
}

export async function runSuspiciousPricingWorker(limit = 100): Promise<WorkerRunResult> {
  const db = asAdminDb(createAdminClient());
  const warnings: string[] = [];
  const { data: listings, error } = await db
    .from("listings")
    .select("id,seller_id,category_id,condition,price_amount,currency,trust_scores:seller_id(seller_score)")
    .eq("status", "active")
    .limit(limit);

  if (error) throw new Error(error.message);

  let flagged = 0;
  for (const listing of listings ?? []) {
    const { data: baseline } = await db
      .from("pricing_baselines")
      .select("median_price,p10_price,p90_price")
      .eq("category_id", listing.category_id)
      .eq("currency", listing.currency)
      .maybeSingle();

    const sellerScore = Array.isArray(listing.trust_scores) ? listing.trust_scores[0]?.seller_score : listing.trust_scores?.seller_score;
    const risk = detectSuspiciousPricing({
      listingId: listing.id,
      priceAmount: Number(listing.price_amount),
      currency: listing.currency,
      categoryMedian: baseline ? Number(baseline.median_price) : null,
      categoryP10: baseline ? Number(baseline.p10_price) : null,
      categoryP90: baseline ? Number(baseline.p90_price) : null,
      sellerScore: sellerScore ? Number(sellerScore) : null
    });

    if (risk.score >= 45) {
      const { error: insertError } = await db.from("automated_risk_flags").insert({
        user_id: listing.seller_id,
        listing_id: listing.id,
        flag_type: "suspicious_pricing",
        severity: risk.severity,
        score: risk.score,
        threshold: 45,
        title: risk.title,
        explanation: risk.explanation,
        recommended_action: risk.recommendedAction,
        detector_version: TRUST_ENGINE_VERSION,
        evidence: { under_median_ratio: risk.underMedianRatio, price_amount: listing.price_amount, baseline }
      });
      if (insertError) warnings.push(`Pricing flag failed for listing ${listing.id}: ${insertError.message}`);
      else flagged += 1;
    }
  }

  return { worker: "suspicious-pricing", processed: (listings ?? []).length, flagged, warnings };
}

export async function runScamMessageWorker(limit = 100): Promise<WorkerRunResult> {
  const db = asAdminDb(createAdminClient());
  const warnings: string[] = [];
  const { data: messages, error } = await db
    .from("messages")
    .select("id,conversation_id,sender_id,body")
    .eq("moderation_status", "pending")
    .limit(limit);

  if (error) throw new Error(error.message);

  let flagged = 0;
  for (const message of messages ?? []) {
    const risk = detectScamMessage(String(message.body));
    const { error: detectionError } = await db.from("scam_message_detections").upsert({
      message_id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      risk_score: risk.score,
      matched_patterns: risk.matchedPatterns,
      classification: risk.classification,
      action: risk.action,
      explanation: risk.explanation,
      detector_version: "scam-message-v1"
    }, { onConflict: "message_id" });

    if (detectionError) warnings.push(`Scam detection failed for message ${message.id}: ${detectionError.message}`);

    if (risk.score >= 35) {
      flagged += 1;
      await db.from("automated_risk_flags").insert({
        user_id: message.sender_id,
        message_id: message.id,
        flag_type: "scam_message",
        severity: risk.severity,
        score: risk.score,
        threshold: 35,
        title: "Possible scam message",
        explanation: risk.explanation,
        recommended_action: risk.action === "block" || risk.action === "hold" ? "Hold or block message and queue analyst review." : "Warn the user and redact risky contact details if needed.",
        detector_version: "scam-message-v1",
        evidence: { matched_patterns: risk.matchedPatterns, classification: risk.classification, action: risk.action }
      });
    }

    await db.from("messages").update({ moderation_status: risk.score >= 70 ? "flagged" : "approved" }).eq("id", message.id);
  }

  return { worker: "scam-message", processed: (messages ?? []).length, flagged, warnings };
}

export async function runDuplicateImageWorker(limit = 100): Promise<WorkerRunResult> {
  const db = asAdminDb(createAdminClient());
  const warnings: string[] = [];
  const { data: fingerprints, error } = await db
    .from("listing_image_fingerprints")
    .select("id,listing_image_id,listing_id,seller_id,perceptual_hash,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  let flagged = 0;
  for (const fingerprint of fingerprints ?? []) {
    const { data: matches } = await db
      .from("listing_image_fingerprints")
      .select("listing_image_id,listing_id,seller_id,perceptual_hash,created_at")
      .eq("perceptual_hash", fingerprint.perceptual_hash)
      .neq("listing_image_id", fingerprint.listing_image_id)
      .limit(5);

    for (const match of matches ?? []) {
      const isCrossSeller = match.seller_id !== fingerprint.seller_id;
      const matchedRecently = Date.now() - new Date(match.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;
      const risk = scoreDuplicateImageMatch(92, isCrossSeller, matchedRecently);

      await db.from("duplicate_image_matches").insert({
        listing_image_id: fingerprint.listing_image_id,
        matched_listing_image_id: match.listing_image_id,
        listing_id: fingerprint.listing_id,
        matched_listing_id: match.listing_id,
        similarity: 92,
        match_type: "perceptual_hash",
        evidence: { perceptual_hash: fingerprint.perceptual_hash, is_cross_seller: isCrossSeller, matched_recently: matchedRecently }
      });

      if (risk.score >= 75) {
        flagged += 1;
        const { error: flagError } = await db.from("automated_risk_flags").insert({
          user_id: fingerprint.seller_id,
          listing_id: fingerprint.listing_id,
          flag_type: "duplicate_image",
          severity: risk.severity,
          score: risk.score,
          threshold: 75,
          title: risk.title,
          explanation: risk.explanation,
          recommended_action: risk.recommendedAction,
          detector_version: TRUST_ENGINE_VERSION,
          evidence: { matched_listing_id: match.listing_id, matched_listing_image_id: match.listing_image_id }
        });
        if (flagError) warnings.push(`Duplicate image flag failed for listing ${fingerprint.listing_id}: ${flagError.message}`);
      }
    }
  }

  return { worker: "duplicate-image", processed: (fingerprints ?? []).length, flagged, warnings };
}

export async function runTrustSafetyWorkers(worker: string = "all", limit = 100) {
  const results: WorkerRunResult[] = [];

  if (worker === "all" || worker === "trust-score") results.push(await runTrustScoreWorker(limit));
  if (worker === "all" || worker === "suspicious-pricing") results.push(await runSuspiciousPricingWorker(limit));
  if (worker === "all" || worker === "scam-message") results.push(await runScamMessageWorker(limit));
  if (worker === "all" || worker === "duplicate-image") results.push(await runDuplicateImageWorker(limit));

  if (!results.length) throw new Error(`Unknown trust safety worker: ${worker}`);
  return results;
}
