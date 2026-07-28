import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TRUST_ENGINE_VERSION,
  calculateCompositeRisk,
  calculateTrustScores,
  defaultTrustBadges,
  type CompositeRiskResult,
  type VerificationCheck,
  type VerificationCheckType,
  type VerificationStatus
} from "@/lib/trust-safety/engine";

const verificationChecklist: Array<{ checkType: VerificationCheckType; label: string; requiredFor: string[]; description: string }> = [
  { checkType: "email", label: "Email", requiredFor: ["account_recovery", "receipts"], description: "Confirms account ownership and enables secure transaction notifications." },
  { checkType: "phone", label: "Phone", requiredFor: ["messaging", "handoff"], description: "Adds conversation and pickup safety context." },
  { checkType: "identity", label: "Identity", requiredFor: ["high_value_buying", "high_value_selling"], description: "Required for elevated limits and stronger trust badges." },
  { checkType: "id_document", label: "Government ID", requiredFor: ["restricted_categories", "disputes"], description: "Optional until required by value, category, or risk policy." },
  { checkType: "payment", label: "Payment", requiredFor: ["buyer_checkout"], description: "Confirms protected payment readiness." },
  { checkType: "payout", label: "Payout profile", requiredFor: ["seller_payouts"], description: "Required before seller funds can be released." },
  { checkType: "category_proof", label: "Category proof", requiredFor: ["high_risk_categories"], description: "Proof of ownership or authorization for sensitive categories." },
];

type Db = SupabaseClient<any>;

export type TrustSafetySummary = {
  userId: string;
  trustScore: {
    score: number;
    sellerScore: number;
    buyerScore: number;
    disputeRate: number;
    fraudRiskLevel: "low" | "medium" | "high" | "critical";
    modelVersion: string;
    signals: Record<string, unknown>;
  };
  verification: Array<{
    checkType: VerificationCheckType;
    label: string;
    status: VerificationStatus;
    description: string;
    requiredFor: string[];
    confidenceScore: number | null;
    expiresAt: string | null;
    provider: string | null;
    submittedAt: string | null;
    verifiedAt: string | null;
    assurance: "not_submitted" | "self_attested_pending" | "provider_verified" | "review_failed" | "expired";
  }>;
  badges: typeof defaultTrustBadges;
  risk: CompositeRiskResult;
  counts: {
    openReports: number;
    openDisputes: number;
    openRiskFlags: number;
    confirmedRiskFlags: number;
    highRiskSignals: number;
    recentScamMessages: number;
  };
};

function asVerificationChecks(rows: any[] | null | undefined): VerificationCheck[] {
  return (rows ?? []).map((row) => ({
    checkType: row.check_type,
    status: row.status,
    confidenceScore: row.confidence_score === null || row.confidence_score === undefined ? null : Number(row.confidence_score),
    expiresAt: row.expires_at ?? null,
  }));
}

function fallbackTrustScore(checks: VerificationCheck[]) {
  const result = calculateTrustScores({
    verificationChecks: checks,
    averageRating: 0,
    reviewCount: 0,
    completedTransactions: 0,
    disputesOpened: 0,
    confirmedRiskFlags: 0,
    openRiskFlags: 0,
  });

  return {
    score: result.overallScore,
    sellerScore: result.sellerScore,
    buyerScore: result.buyerReliabilityScore,
    disputeRate: result.disputeRate,
    fraudRiskLevel: result.fraudRiskLevel,
    modelVersion: result.formulaVersion,
    signals: { identity_points: result.identityPoints, formula_version: result.formulaVersion },
  };
}

export async function getUserTrustSafetySummary(supabase: Db, userId: string): Promise<TrustSafetySummary> {
  const [
    checksResult,
    trustResult,
    badgesResult,
    reportsResult,
    disputesResult,
    flagsResult,
    signalsResult,
    scamResult
  ] = await Promise.all([
    supabase.from("user_verification_checks").select("check_type,status,provider,confidence_score,submitted_at,verified_at,expires_at,required_for").eq("user_id", userId),
    supabase.from("trust_scores").select("score,seller_score,buyer_score,dispute_rate,fraud_risk_level,model_version,signals").eq("user_id", userId).maybeSingle(),
    supabase.from("user_trust_badges").select("code,label,description,level,icon").eq("user_id", userId).eq("visibility", "public"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("reported_user_id", userId).in("status", ["open", "triaged", "investigating"]),
    supabase.from("disputes").select("id,transactions!inner(buyer_id,seller_id)", { count: "exact", head: true }).or(`transactions.buyer_id.eq.${userId},transactions.seller_id.eq.${userId}`).in("status", ["opened", "awaiting_buyer", "awaiting_seller", "under_review"]),
    supabase.from("automated_risk_flags").select("status").eq("user_id", userId),
    supabase.from("fraud_signals").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("risk_score", 70).is("reviewed_at", null),
    supabase.from("scam_message_detections").select("id", { count: "exact", head: true }).eq("sender_id", userId).gte("risk_score", 35)
  ]);

  const checks = asVerificationChecks(checksResult.data);
  const trustScore = trustResult.data
    ? {
        score: Number(trustResult.data.score ?? 0),
        sellerScore: Number(trustResult.data.seller_score ?? 0),
        buyerScore: Number(trustResult.data.buyer_score ?? 0),
        disputeRate: Number(trustResult.data.dispute_rate ?? 0),
        fraudRiskLevel: trustResult.data.fraud_risk_level ?? "low",
        modelVersion: trustResult.data.model_version ?? TRUST_ENGINE_VERSION,
        signals: (trustResult.data.signals && typeof trustResult.data.signals === "object" ? trustResult.data.signals : {}) as Record<string, unknown>,
      }
    : fallbackTrustScore(checks);

  const openRiskFlags = (flagsResult.data ?? []).filter((flag: { status: string }) => ["open", "auto_contained", "in_review"].includes(flag.status)).length;
  const confirmedRiskFlags = (flagsResult.data ?? []).filter((flag: { status: string }) => flag.status === "confirmed").length;
  const counts = {
    openReports: reportsResult.count ?? 0,
    openDisputes: disputesResult.count ?? 0,
    openRiskFlags,
    confirmedRiskFlags,
    highRiskSignals: signalsResult.count ?? 0,
    recentScamMessages: scamResult.count ?? 0,
  };
  const risk = calculateCompositeRisk({
    trustScore: trustScore.score,
    sellerScore: trustScore.sellerScore,
    buyerScore: trustScore.buyerScore,
    verificationChecks: checks,
    ...counts,
  });

  return {
    userId,
    trustScore,
    verification: verificationChecklist.map((item) => {
      const check = checksResult.data?.find((row: any) => row.check_type === item.checkType);
      return {
        checkType: item.checkType,
        label: item.label,
        status: check?.status ?? "not_started",
        description: item.description,
        requiredFor: check?.required_for ?? item.requiredFor,
        confidenceScore: check?.confidence_score === null || check?.confidence_score === undefined ? null : Number(check.confidence_score),
        expiresAt: check?.expires_at ?? null,
        provider: check?.provider ?? null,
        submittedAt: check?.submitted_at ?? null,
        verifiedAt: check?.verified_at ?? null,
        assurance: check?.status === "verified"
          ? "provider_verified"
          : check?.status === "pending"
            ? "self_attested_pending"
            : check?.status === "failed"
              ? "review_failed"
              : check?.status === "expired"
                ? "expired"
                : "not_submitted",
      };
    }),
    badges: (badgesResult.data?.length ? badgesResult.data : defaultTrustBadges.filter((badge) => {
      if (badge.code === "email_verified") return checks.some((check) => check.checkType === "email" && check.status === "verified");
      if (badge.code === "phone_verified") return checks.some((check) => check.checkType === "phone" && check.status === "verified");
      if (badge.code === "identity_verified") return checks.some((check) => check.checkType === "identity" && check.status === "verified");
      return false;
    })) as typeof defaultTrustBadges,
    risk,
    counts,
  };
}

export async function submitVerificationCheck(supabase: Db, userId: string, input: { checkType: VerificationCheckType; note?: string | null }) {
  const check = verificationChecklist.find((item) => item.checkType === input.checkType);
  if (!check) throw new Error("Unsupported verification check.");

  const status: VerificationStatus = "pending";
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("user_verification_checks").upsert({
    user_id: userId,
    check_type: input.checkType,
    status,
    provider: "marketplace_self_attested",
    provider_check_id: null,
    confidence_score: null,
    required_for: check.requiredFor,
    submitted_at: now,
    verified_at: null,
    evidence: {},
    metadata: {
      source: "verification_center",
      submission_note: input.note?.trim().slice(0, 500) || null,
      engine_version: TRUST_ENGINE_VERSION
    },
  }, { onConflict: "user_id,check_type" }).select("*").single();

  if (error) throw error;
  await supabase.rpc("recompute_user_trust_score", { p_user_id: userId });
  return data;
}

export async function createTrustSafetyReport(supabase: Db, reporterId: string, input: {
  reason: string;
  description?: string | null;
  reportedUserId?: string | null;
  listingId?: string | null;
  messageId?: string | null;
}) {
  if (!input.reportedUserId && !input.listingId && !input.messageId) {
    throw new Error("A report must include a user, listing, or message subject.");
  }

  const { data, error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_user_id: input.reportedUserId ?? null,
    listing_id: input.listingId ?? null,
    message_id: input.messageId ?? null,
    reason: input.reason,
    description: input.description ?? null,
    status: "open",
    metadata: { source: "trust_safety_intake", engine_version: TRUST_ENGINE_VERSION },
  }).select("*").single();
  if (error) throw error;

  await supabase.from("admin_review_queue_items").insert({
    queue: "reports",
    subject_type: "report",
    subject_id: data.id,
    priority: 70,
    severity: "medium",
    title: "New trust and safety report",
    summary: input.description || input.reason,
    source: "reports",
    due_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    metadata: { reason: input.reason, reported_user_id: input.reportedUserId ?? null, listing_id: input.listingId ?? null, message_id: input.messageId ?? null },
  });

  return data;
}

export async function getAdminTrustSafetyDashboard(supabase: Db, limit = 50) {
  const [queue, flags, reports, disputes, verifications] = await Promise.all([
    supabase.from("admin_review_queue_items").select("*").in("status", ["queued", "assigned", "investigating", "waiting_on_user"]).order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(limit),
    supabase.from("automated_risk_flags").select("*").in("status", ["open", "auto_contained", "in_review"]).order("score", { ascending: false }).limit(limit),
    supabase.from("reports").select("*").in("status", ["open", "triaged", "investigating"]).order("created_at", { ascending: false }).limit(limit),
    supabase.from("disputes").select("*").in("status", ["opened", "awaiting_buyer", "awaiting_seller", "under_review"]).order("created_at", { ascending: false }).limit(limit),
    supabase.from("user_verification_checks").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(limit),
  ]);

  for (const result of [queue, flags, reports, disputes, verifications]) {
    if (result.error) throw result.error;
  }

  return {
    queueItems: queue.data ?? [],
    riskFlags: flags.data ?? [],
    reports: reports.data ?? [],
    disputes: disputes.data ?? [],
    verifications: verifications.data ?? [],
    metrics: {
      queueItems: queue.data?.length ?? 0,
      criticalFlags: (flags.data ?? []).filter((flag: any) => flag.severity === "critical").length,
      openReports: reports.data?.length ?? 0,
      openDisputes: disputes.data?.length ?? 0,
      pendingVerifications: verifications.data?.length ?? 0,
    },
  };
}

export async function updateAdminReviewItem(supabase: Db, input: { id: string; adminId: string; status: string; decision?: string | null; decisionReason?: string | null }) {
  const closed = ["actioned", "dismissed", "closed"].includes(input.status);
  const { data, error } = await supabase.from("admin_review_queue_items").update({
    status: input.status,
    assigned_admin_id: input.adminId,
    decision: input.decision ?? null,
    decision_reason: input.decisionReason ?? null,
    closed_at: closed ? new Date().toISOString() : null,
  }).eq("id", input.id).select("*").single();
  if (error) throw error;
  return data;
}
