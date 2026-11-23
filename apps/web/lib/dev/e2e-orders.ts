export const e2ePurchases = [
  { id: "44444444-4444-4444-8444-444444444444", listing_id: "verified-road-bike", status: "completed", total_amount: 20, currency: "USD", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z", paid_at: "2026-01-01T00:00:00.000Z", delivered_at: null, completed_at: "2026-01-02T00:00:00.000Z", title: "Preview completed order" },
  { id: "55555555-5555-4555-8555-555555555555", listing_id: "verified-road-bike", status: "escrowed", total_amount: 40, currency: "USD", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z", paid_at: "2026-01-01T00:00:00.000Z", delivered_at: null, completed_at: null, title: "Preview escrow order" },
  { id: "77777777-7777-4777-8777-777777777777", listing_id: "verified-road-bike", status: "shipped", total_amount: 35, currency: "USD", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z", paid_at: "2026-01-01T00:00:00.000Z", delivered_at: null, completed_at: null, title: "Preview pickup order", pickupAvailable: true, fulfillmentMethod: "pickup" as const },
  { id: "88888888-8888-4888-8888-888888888888", listing_id: "verified-road-bike", status: "disputed", total_amount: 45, currency: "USD", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z", paid_at: "2026-01-01T00:00:00.000Z", delivered_at: null, completed_at: null, title: "Preview disputed order", disputeId: "99999999-9999-4999-8999-999999999999" }
];

export const e2eSales = [
  { id: "66666666-6666-4666-8666-666666666666", listing_id: "verified-road-bike", status: "escrowed", total_amount: 40, marketplace_fee_amount: 4, currency: "USD", updated_at: "2026-01-02T00:00:00.000Z", paid_at: "2026-01-01T00:00:00.000Z", title: "Preview escrow sale", payout: undefined, pickupAvailable: true, shipsAvailable: true },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", listing_id: "verified-road-bike", status: "paid", total_amount: 55, marketplace_fee_amount: 5, currency: "USD", updated_at: "2026-11-22T00:00:00.000Z", paid_at: "2026-11-22T12:00:00.000Z", title: "Preview authorized sale", payout: undefined, pickupAvailable: true, shipsAvailable: true }
];
