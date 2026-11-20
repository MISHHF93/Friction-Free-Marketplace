export type OfferResponse = "accepted" | "declined" | "withdrawn" | "expired";

export function offerResponseAllowed(input: {
  actorId: string;
  createdById: string | null;
  buyerId: string;
  sellerId: string;
  response: OfferResponse;
}) {
  const participant = input.actorId === input.buyerId || input.actorId === input.sellerId;
  if (!participant) return false;
  if (input.response === "expired") return true;
  if (input.response === "withdrawn") return input.actorId === input.createdById;
  return Boolean(input.createdById) && input.actorId !== input.createdById;
}
