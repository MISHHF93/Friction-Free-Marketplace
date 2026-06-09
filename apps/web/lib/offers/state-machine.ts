import { z } from "zod";

export const offerStatusSchema = z.enum([
  "pending",
  "accepted",
  "countered",
  "declined",
  "expired",
  "withdrawn",
]);

export const offerTransitionSchema = z.enum([
  "offer",
  "counter",
  "accept",
  "reject",
  "withdraw",
  "expire",
]);

export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type OfferTransition = z.infer<typeof offerTransitionSchema>;

export const terminalOfferStatuses = ["accepted", "countered", "declined", "expired", "withdrawn"] satisfies OfferStatus[];

export const offerStateMachine: Record<OfferStatus, OfferTransition[]> = {
  pending: ["counter", "accept", "reject", "withdraw", "expire"],
  accepted: [],
  countered: [],
  declined: [],
  expired: [],
  withdrawn: [],
};

export const offerTransitionToStatus: Record<Exclude<OfferTransition, "offer">, OfferStatus> = {
  counter: "countered",
  accept: "accepted",
  reject: "declined",
  withdraw: "withdrawn",
  expire: "expired",
};

export function displayOfferStatus(status: OfferStatus) {
  return status === "declined" ? "rejected" : status;
}

export function canTransitionOffer(status: OfferStatus, transition: OfferTransition) {
  if (transition === "offer") return true;
  return offerStateMachine[status].includes(transition);
}

export function isTerminalOfferStatus(status: OfferStatus) {
  return status !== "pending";
}

export function isOfferExpired(expiresAt: string | null | undefined, now = Date.now()) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
}

export function recipientForOfferAction({
  buyerId,
  sellerId,
  actorId,
}: {
  buyerId: string;
  sellerId: string;
  actorId: string | null | undefined;
}) {
  if (actorId === buyerId) return sellerId;
  if (actorId === sellerId) return buyerId;
  return null;
}
