import { describe, expect, it } from "vitest";
import {
  canTransitionOffer,
  displayOfferStatus,
  isOfferExpired,
  isTerminalOfferStatus,
  offerTransitionToStatus,
} from "@/lib/offers/state-machine";

describe("offer negotiation state machine", () => {
  it("allows pending offers to move through supported negotiation actions", () => {
    expect(canTransitionOffer("pending", "counter")).toBe(true);
    expect(canTransitionOffer("pending", "accept")).toBe(true);
    expect(canTransitionOffer("pending", "reject")).toBe(true);
    expect(canTransitionOffer("pending", "withdraw")).toBe(true);
    expect(canTransitionOffer("pending", "expire")).toBe(true);
  });

  it("treats non-pending states as terminal", () => {
    expect(isTerminalOfferStatus("accepted")).toBe(true);
    expect(isTerminalOfferStatus("countered")).toBe(true);
    expect(canTransitionOffer("accepted", "reject")).toBe(false);
    expect(canTransitionOffer("expired", "accept")).toBe(false);
  });

  it("maps user-facing actions to database statuses", () => {
    expect(offerTransitionToStatus.accept).toBe("accepted");
    expect(offerTransitionToStatus.reject).toBe("declined");
    expect(offerTransitionToStatus.expire).toBe("expired");
    expect(displayOfferStatus("declined")).toBe("rejected");
  });

  it("detects due offers by expiration timestamp", () => {
    expect(isOfferExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isOfferExpired(new Date(Date.now() + 1000).toISOString())).toBe(false);
    expect(isOfferExpired(null)).toBe(false);
  });
});
