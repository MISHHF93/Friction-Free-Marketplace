import { describe, expect, it } from "vitest";
import { canSubmitDisputeEvidence, contentTypeForEvidence, evidenceExtension, requestedEvidenceParty } from "@/lib/disputes/evidence";

describe("dispute evidence", () => {
  it("accepts notes and photos only while the dispute is open", () => {
    expect(canSubmitDisputeEvidence("opened")).toBe(true);
    expect(canSubmitDisputeEvidence("awaiting_buyer")).toBe(true);
    expect(canSubmitDisputeEvidence("resolved_buyer")).toBe(false);
    expect(canSubmitDisputeEvidence("closed")).toBe(false);
  });

  it("maps a requested evidence party from the dispute status", () => {
    expect(requestedEvidenceParty("awaiting_buyer")).toBe("buyer");
    expect(requestedEvidenceParty("awaiting_seller")).toBe("seller");
    expect(requestedEvidenceParty("under_review")).toBeNull();
  });

  it("accepts common photo types for the private evidence bucket", () => {
    expect(contentTypeForEvidence({ name: "door.jpg", type: "image/jpeg" })).toBe("image/jpeg");
    expect(contentTypeForEvidence({ name: "box.webp", type: "" })).toBe("image/webp");
    expect(contentTypeForEvidence({ name: "notes.pdf", type: "application/pdf" })).toBe("");
    expect(evidenceExtension("photo.JPEG", "image/jpeg")).toBe("jpg");
  });
});
