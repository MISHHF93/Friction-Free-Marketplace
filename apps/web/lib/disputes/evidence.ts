export const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence";
export const DISPUTE_EVIDENCE_MAX_BYTES = 8 * 1024 * 1024;
export const DISPUTE_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
export const OPEN_EVIDENCE_STATUSES = ["opened", "awaiting_buyer", "awaiting_seller", "under_review"] as const;

export function evidenceExtension(name: string, type: string) {
  const fromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName === "jpg" || fromName === "jpeg" || fromName === "png" || fromName === "webp" || fromName === "heic" || fromName === "heif") {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "jpg";
}

export function contentTypeForEvidence(file: { name: string; type: string }) {
  if (file.type && DISPUTE_EVIDENCE_TYPES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return "";
}

export function canSubmitDisputeEvidence(status: string | null | undefined) {
  return OPEN_EVIDENCE_STATUSES.includes(status as (typeof OPEN_EVIDENCE_STATUSES)[number]);
}

export function requestedEvidenceParty(status: string | null | undefined): "buyer" | "seller" | null {
  if (status === "awaiting_buyer") return "buyer";
  if (status === "awaiting_seller") return "seller";
  return null;
}
