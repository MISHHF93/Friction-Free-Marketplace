export const openCheckoutStatuses = [
  "pending_payment",
  "paid",
  "escrowed",
  "shipped",
  "delivered",
  "disputed"
] as const;

export type OpenCheckoutStatus = (typeof openCheckoutStatuses)[number];
