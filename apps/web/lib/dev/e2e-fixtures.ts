import { acceptByDeadline, formatAcceptBy } from "@/lib/payments/uncaptured-order";

export async function loadE2EPurchases(userId: string) {
  if (process.env.NODE_ENV === "production" || process.env.FFM_E2E_AUTH !== "true") return [];
  if (userId !== "11111111-1111-4111-8111-111111111111") return [];
  const fixtures = await import("@/lib/dev/e2e-orders");
  return fixtures.e2ePurchases;
}

export async function loadE2ESales(userId: string) {
  if (process.env.NODE_ENV === "production" || process.env.FFM_E2E_AUTH !== "true") return [];
  if (userId !== "22222222-2222-4222-8222-222222222222") return [];
  const fixtures = await import("@/lib/dev/e2e-orders");
  return fixtures.e2eSales.map((sale) => ({
    ...sale,
    acceptBy: sale.status === "paid" && sale.paid_at ? formatAcceptBy(acceptByDeadline(sale.paid_at)) : null
  }));
}
