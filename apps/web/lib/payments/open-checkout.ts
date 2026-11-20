export const openCheckoutStatuses = [
  "pending_payment",
  "paid",
  "escrowed",
  "shipped",
  "delivered",
  "disputed",
  "resolving"
] as const;

export type OpenCheckoutStatus = (typeof openCheckoutStatuses)[number];
