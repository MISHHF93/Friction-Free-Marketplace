export type RiskSeverity = "info" | "low" | "medium" | "high" | "critical";
export type RiskAction = "allow" | "warn" | "redact" | "hold" | "block";

export type VerificationStatus = "not_started" | "pending" | "verified" | "failed" | "expired" | "waived";
export type VerificationCheckType = "identity" | "email" | "phone" | "id_document" | "payment" | "payout" | "category_proof";

export type VerificationCheck = {
  checkType: VerificationCheckType;
  status: VerificationStatus;
  confidenceScore?: number | null;
  expiresAt?: string | null;
};

export type TrustScoreInputs = {
  verificationChecks: VerificationCheck[];
  averageRating: number;
  reviewCount: number;
  completedTransactions: number;
  disputesOpened: number;
  confirmedRiskFlags: number;
  openRiskFlags: number;
  responseRate?: number;
  cancellationRate?: number;
  noShowRate?: number;
};

export type TrustScoreResult = {
  identityPoints: number;
  sellerScore: number;
  buyerReliabilityScore: number;
  overallScore: number;
  disputeRate: number;
  fraudRiskLevel: Exclude<RiskSeverity, "info">;
  badges: TrustBadgeDefinition[];
  formulaVersion: string;
};

export type TrustBadgeDefinition = {
  code: string;
  label: string;
  description: string;
  level: "standard" | "silver" | "gold" | "platinum" | "limited";
  icon: "mail-check" | "phone-check" | "id-card" | "shield-check" | "star" | "alert-triangle";
};

export type ListingPricingInput = {
  listingId: string;
  priceAmount: number;
  currency: string;
  categoryMedian?: number | null;
  categoryP10?: number | null;
  categoryP90?: number | null;
  sellerScore?: number | null;
};

export type PricingRiskResult = {
  score: number;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
  underMedianRatio: number | null;
};

export type MessageRiskResult = {
  score: number;
  severity: RiskSeverity;
  action: RiskAction;
  classification: "safe" | "contact_harvesting" | "off_platform_payment" | "phishing" | "shipping_scam" | "overpayment" | "unknown";
  matchedPatterns: string[];
  explanation: string;
};

export type DuplicateImageRiskResult = {
  score: number;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
};

export type CompositeRiskInput = {
  trustScore?: number | null;
  sellerScore?: number | null;
  buyerScore?: number | null;
  verificationChecks: VerificationCheck[];
  openReports: number;
  openDisputes: number;
  openRiskFlags: number;
  confirmedRiskFlags: number;
  highRiskSignals: number;
  recentScamMessages?: number;
  highValueExposure?: number;
};

export type CompositeRiskResult = {
  score: number;
  severity: Exclude<RiskSeverity, "info">;
  action: "allow" | "review" | "hold" | "restrict";
  reasons: string[];
  recommendedWorkflow: "standard" | "verification_review" | "fraud_review" | "dispute_review" | "account_restriction";
  formulaVersion: string;
};

export const TRUST_ENGINE_VERSION = "trust-engine-v1";

const EMAIL_POINTS = 12;
const PHONE_POINTS = 12;
const IDENTITY_POINTS = 16;
const ID_DOCUMENT_POINTS = 15;
const PAYMENT_POINTS = 10;
const PAYOUT_POINTS = 10;
const CATEGORY_PROOF_POINTS = 5;

export const scoringFormulas = {
  identityVerification:
    "identity_points = verified_email(12) + verified_phone(12) + identity(16) + optional_id_document(15) + payment(10) + payout(10) + category_proof(5), clamped to 0-100.",
  sellerTrust:
    "seller_score = 25% identity_points + up to 25 pts completed transactions + 30 pts average review rating + 15 pts dispute health - 12 pts confirmed flag - 4 pts open flag, clamped to 0-100.",
  buyerReliability:
    "buyer_reliability_score = 30% identity_points + up to 20 pts completed purchases + 20 pts average review rating + 20 pts dispute/no-show health + 10 pt good-standing reserve - 10 pts confirmed flag - 3 pts open flag, clamped to 0-100.",
  suspiciousPricing:
    "pricing_risk = discount_from_category_median + below_p10_bonus + low_trust_seller_bonus. High risk starts at 70; critical at 90.",
  scamMessages:
    "message_risk = weighted keyword/domain/contact/payment patterns with action thresholds: warn >=35, redact >=55, hold >=70, block >=85.",
  duplicateImages:
    "duplicate_image_risk = image_similarity + cross-seller reuse bonus + recently published match bonus. High risk starts at 75; critical at 92.",
  listingFraudV1:
    "listing_fraud_v1 = strongest rule score + 35% of supporting rule scores, clamped to 100. Rules: suspicious low price, duplicate title, duplicate image hash, new account expensive item, listing velocity, and category mismatch. Hold >=70; block publish >=85.",
  messageFraudV1:
    "message_fraud_v1 creates signals for repeated external payment language and high message report rate. Repeated off-platform payment detections hold messages >=70 and remove/block >=85.",
  compositeAccountRisk:
    "composite_account_risk = low trust score penalty + missing verification + open reports/disputes + open/confirmed risk flags + high-risk signals + scam-message history + high-value exposure. Review >=45, hold >=70, restrict >=90."
} as const;

export const defaultTrustBadges: TrustBadgeDefinition[] = [
  { code: "email_verified", label: "Email verified", description: "The account controls a verified email address.", level: "standard", icon: "mail-check" },
  { code: "phone_verified", label: "Phone verified", description: "The account controls a verified phone number.", level: "standard", icon: "phone-check" },
  { code: "identity_verified", label: "Identity verified", description: "The account passed identity verification.", level: "silver", icon: "shield-check" },
  { code: "id_verified", label: "Optional ID verified", description: "The account passed optional document verification for higher trust limits.", level: "gold", icon: "id-card" },
  { code: "trusted_seller", label: "Trusted seller", description: "Strong seller trust score, reviews, and dispute history.", level: "platinum", icon: "star" },
  { code: "reliable_buyer", label: "Reliable buyer", description: "Strong buyer reliability from completed purchases and low disputes.", level: "gold", icon: "star" }
];

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function hasVerified(checks: VerificationCheck[], checkType: VerificationCheckType) {
  const now = Date.now();
  return checks.some((check) => {
    const notExpired = !check.expiresAt || new Date(check.expiresAt).getTime() > now;
    return check.checkType === checkType && check.status === "verified" && notExpired;
  });
}

export function calculateIdentityPoints(checks: VerificationCheck[]) {
  return clampScore(
    (hasVerified(checks, "email") ? EMAIL_POINTS : 0) +
      (hasVerified(checks, "phone") ? PHONE_POINTS : 0) +
      (hasVerified(checks, "identity") ? IDENTITY_POINTS : 0) +
      (hasVerified(checks, "id_document") ? ID_DOCUMENT_POINTS : 0) +
      (hasVerified(checks, "payment") ? PAYMENT_POINTS : 0) +
      (hasVerified(checks, "payout") ? PAYOUT_POINTS : 0) +
      (hasVerified(checks, "category_proof") ? CATEGORY_PROOF_POINTS : 0)
  );
}

export function calculateTrustScores(inputs: TrustScoreInputs): TrustScoreResult {
  const identityPoints = calculateIdentityPoints(inputs.verificationChecks);
  const averageRating = Math.min(5, Math.max(0, inputs.averageRating || 0));
  const completedTransactions = Math.max(0, inputs.completedTransactions || 0);
  const disputeRate = Math.min(1, Math.max(0, inputs.disputesOpened / Math.max(1, completedTransactions)));
  const riskPenalty = inputs.confirmedRiskFlags * 12 + inputs.openRiskFlags * 4;
  const buyerPenalty = inputs.confirmedRiskFlags * 10 + inputs.openRiskFlags * 3 + (inputs.noShowRate ?? 0) * 12;
  const cancellationPenalty = (inputs.cancellationRate ?? 0) * 10;
  const responseBonus = Math.min(5, Math.max(0, (inputs.responseRate ?? 0) * 5));

  const sellerScore = clampScore(
    identityPoints * 0.25 +
      Math.min(completedTransactions, 20) * 1.25 +
      (averageRating / 5) * 30 +
      (1 - disputeRate) * 15 +
      responseBonus -
      riskPenalty -
      cancellationPenalty
  );

  const buyerReliabilityScore = clampScore(
    identityPoints * 0.3 +
      Math.min(completedTransactions, 20) +
      (averageRating / 5) * 20 +
      (1 - disputeRate) * 20 +
      10 -
      buyerPenalty
  );

  const overallScore = clampScore(identityPoints * 0.2 + sellerScore * 0.4 + buyerReliabilityScore * 0.4);
  const fraudRiskLevel = inputs.confirmedRiskFlags > 0 || inputs.openRiskFlags >= 3 ? "critical" : inputs.openRiskFlags === 2 ? "high" : inputs.openRiskFlags === 1 ? "medium" : "low";

  return {
    identityPoints,
    sellerScore,
    buyerReliabilityScore,
    overallScore,
    disputeRate,
    fraudRiskLevel,
    badges: deriveTrustBadges(inputs.verificationChecks, sellerScore, buyerReliabilityScore, inputs.reviewCount),
    formulaVersion: TRUST_ENGINE_VERSION
  };
}

export function deriveTrustBadges(checks: VerificationCheck[], sellerScore: number, buyerReliabilityScore: number, reviewCount: number) {
  return defaultTrustBadges.filter((badge) => {
    if (badge.code === "email_verified") return hasVerified(checks, "email");
    if (badge.code === "phone_verified") return hasVerified(checks, "phone");
    if (badge.code === "identity_verified") return hasVerified(checks, "identity");
    if (badge.code === "id_verified") return hasVerified(checks, "id_document");
    if (badge.code === "trusted_seller") return sellerScore >= 85 && reviewCount >= 5;
    if (badge.code === "reliable_buyer") return buyerReliabilityScore >= 80;
    return false;
  });
}

function severityFromScore(score: number): RiskSeverity {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "info";
}

export function detectSuspiciousPricing(input: ListingPricingInput): PricingRiskResult {
  if (!input.categoryMedian || input.categoryMedian <= 0) {
    return { score: 0, severity: "info", title: "No pricing baseline", explanation: "No reliable category pricing baseline is available yet.", recommendedAction: "Allow listing and refresh pricing baselines.", underMedianRatio: null };
  }

  const underMedianRatio = Math.max(0, 1 - input.priceAmount / input.categoryMedian);
  const belowP10 = input.categoryP10 ? input.priceAmount < input.categoryP10 : false;
  const lowTrustBonus = input.sellerScore !== null && input.sellerScore !== undefined && input.sellerScore < 45 ? 15 : 0;
  const score = clampScore(underMedianRatio * 100 + (belowP10 ? 20 : 0) + lowTrustBonus);
  const severity = severityFromScore(score);

  return {
    score,
    severity,
    title: severity === "critical" || severity === "high" ? "Suspiciously low price" : "Price variance detected",
    explanation: `Listing price is ${(underMedianRatio * 100).toFixed(0)}% below the category median${belowP10 ? " and below the p10 baseline" : ""}.`,
    recommendedAction: score >= 70 ? "Hold listing for proof-of-ownership or admin review before ranking." : "Show seller price guidance and monitor buyer reports.",
    underMedianRatio
  };
}

const scamPatterns: Array<{ label: string; regex: RegExp; score: number; classification: MessageRiskResult["classification"] }> = [
  { label: "off-platform payment", regex: /\b(?:cashapp|venmo|zelle|western union|wire transfer|crypto|bitcoin|gift cards?|paypal friends|outside (?:the )?app)\b/i, score: 32, classification: "off_platform_payment" },
  { label: "contact harvesting", regex: /\b(?:text me|call me|whatsapp|telegram|signal|email me|phone number|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i, score: 22, classification: "contact_harvesting" },
  { label: "phishing link", regex: /https?:\/\/(?![^\s/]*friction-free-marketplace\.com)\S+/i, score: 24, classification: "phishing" },
  { label: "shipping courier scam", regex: /\b(?:courier|shipping agent|pickup agent|fake label|insurance fee|customs fee)\b/i, score: 20, classification: "shipping_scam" },
  { label: "overpayment", regex: /\b(?:overpay|extra money|refund the difference|certified check|cashier'?s check)\b/i, score: 28, classification: "overpayment" },
  { label: "urgency pressure", regex: /\b(?:urgent|right now|today only|don'?t tell|trust me|kindly|dear friend)\b/i, score: 10, classification: "unknown" }
];

export function detectScamMessage(body: string): MessageRiskResult {
  const matches = scamPatterns.filter((pattern) => pattern.regex.test(body));
  const score = clampScore(matches.reduce((total, match) => total + match.score, 0));
  const severity = severityFromScore(score);
  const action: RiskAction = score >= 85 ? "block" : score >= 70 ? "hold" : score >= 55 ? "redact" : score >= 35 ? "warn" : "allow";
  const classification = matches.find((match) => match.classification !== "unknown")?.classification ?? (score > 0 ? "unknown" : "safe");

  return {
    score,
    severity,
    action,
    classification,
    matchedPatterns: matches.map((match) => match.label),
    explanation: matches.length > 0 ? `Matched ${matches.map((match) => match.label).join(", ")} scam signal(s).` : "No scam message patterns matched."
  };
}

export function scoreDuplicateImageMatch(similarity: number, isCrossSeller: boolean, matchedRecently: boolean): DuplicateImageRiskResult {
  const score = clampScore(similarity + (isCrossSeller ? 12 : 0) + (matchedRecently ? 5 : 0));
  const severity = severityFromScore(score);

  return {
    score,
    severity,
    title: score >= 75 ? "Potential duplicate image fraud" : "Duplicate image similarity detected",
    explanation: `Image similarity is ${similarity.toFixed(1)}%${isCrossSeller ? " across different sellers" : ""}${matchedRecently ? " with a recent listing match" : ""}.`,
    recommendedAction: score >= 75 ? "Queue for listing review and request proof of ownership." : "Keep listing live and monitor reports."
  };
}

export function calculateCompositeRisk(input: CompositeRiskInput): CompositeRiskResult {
  const identityPoints = calculateIdentityPoints(input.verificationChecks);
  const trustScore = Math.max(0, Math.min(100, input.trustScore ?? input.sellerScore ?? input.buyerScore ?? 50));
  const reasons: string[] = [];
  let score = 0;

  if (trustScore < 45) {
    const penalty = 45 - trustScore;
    score += penalty;
    reasons.push(`Low trust score contributes ${penalty.toFixed(0)} risk points.`);
  }

  if (identityPoints < 24) {
    score += 15;
    reasons.push("Limited verification coverage.");
  }

  if (input.openReports > 0) {
    const points = Math.min(20, input.openReports * 5);
    score += points;
    reasons.push(`${input.openReports} open report(s).`);
  }

  if (input.openDisputes > 0) {
    const points = Math.min(25, input.openDisputes * 8);
    score += points;
    reasons.push(`${input.openDisputes} open dispute(s).`);
  }

  if (input.openRiskFlags > 0) {
    const points = Math.min(30, input.openRiskFlags * 8);
    score += points;
    reasons.push(`${input.openRiskFlags} open risk flag(s).`);
  }

  if (input.confirmedRiskFlags > 0) {
    const points = Math.min(40, input.confirmedRiskFlags * 20);
    score += points;
    reasons.push(`${input.confirmedRiskFlags} confirmed risk flag(s).`);
  }

  if (input.highRiskSignals > 0) {
    const points = Math.min(25, input.highRiskSignals * 10);
    score += points;
    reasons.push(`${input.highRiskSignals} high-risk fraud signal(s).`);
  }

  if ((input.recentScamMessages ?? 0) > 0) {
    const points = Math.min(20, (input.recentScamMessages ?? 0) * 7);
    score += points;
    reasons.push(`${input.recentScamMessages} recent scam-message detection(s).`);
  }

  if ((input.highValueExposure ?? 0) >= 2500 && identityPoints < 40) {
    score += 12;
    reasons.push("High-value exposure with incomplete identity verification.");
  }

  const boundedScore = clampScore(score);
  const severity: Exclude<RiskSeverity, "info"> = boundedScore >= 90 ? "critical" : boundedScore >= 70 ? "high" : boundedScore >= 45 ? "medium" : "low";
  const action = boundedScore >= 90 ? "restrict" : boundedScore >= 70 ? "hold" : boundedScore >= 45 ? "review" : "allow";
  const recommendedWorkflow = input.confirmedRiskFlags > 0 || input.highRiskSignals > 0
    ? "fraud_review"
    : input.openDisputes > 0
      ? "dispute_review"
      : identityPoints < 24
        ? "verification_review"
        : boundedScore >= 90
          ? "account_restriction"
          : "standard";

  return {
    score: boundedScore,
    severity,
    action,
    reasons: reasons.length ? reasons : ["No elevated risk signals detected."],
    recommendedWorkflow,
    formulaVersion: TRUST_ENGINE_VERSION
  };
}
