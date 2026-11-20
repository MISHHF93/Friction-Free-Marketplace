import { describe, expect, it } from "vitest";
import { clientChargesMatchQuote, quoteCheckoutAmounts } from "@/lib/payments/quote";
import { paymentAccountEligibility } from "@/lib/payments/auth";
import { authorizeJobRequest } from "@/lib/security/secrets";

describe("checkout quote", () => {
  it("ignores client shipping and uses seller metadata only", () => {
    const quote = quoteCheckoutAmounts({
      priceAmount: 20,
      metadata: { shipping_cents: 500, shipping_amount: 80 }
    });

    expect(quote.itemCents).toBe(2000);
    expect(quote.shippingCents).toBe(500);
    expect(quote.taxCents).toBe(0);
    expect(clientChargesMatchQuote(quote, {})).toBe(true);
    expect(clientChargesMatchQuote(quote, { shippingCents: 500, taxCents: 0 })).toBe(true);
    expect(clientChargesMatchQuote(quote, { shippingCents: 0 })).toBe(false);
    expect(clientChargesMatchQuote(quote, { taxCents: 250 })).toBe(false);
  });

  it("quotes zero shipping when the listing does not define it", () => {
    const quote = quoteCheckoutAmounts({ priceAmount: 10, metadata: { note: "buyer typed 40" } });
    expect(quote.shippingCents).toBe(0);
    expect(quote.taxCents).toBe(0);
  });
});

describe("payment account eligibility", () => {
  it("requires an existing active marketplace user", () => {
    expect(paymentAccountEligibility(null)).toBe("ineligible");
    expect(paymentAccountEligibility(undefined)).toBe("ineligible");
    expect(paymentAccountEligibility({ status: null })).toBe("ineligible");
    expect(paymentAccountEligibility({ status: "suspended" })).toBe("ineligible");
    expect(paymentAccountEligibility({ status: "active" })).toBe("active");
  });
});

describe("job authorization", () => {
  it("fails closed when the secret is missing and rejects a bad bearer token", () => {
    const request = new Request("https://market.example/api/search/sync", {
      headers: { authorization: "Bearer wrong" }
    });
    expect(authorizeJobRequest(request, undefined, "Unauthorized search sync request.")).toEqual({
      ok: false,
      status: 503,
      error: "Job secret is not configured."
    });
    expect(authorizeJobRequest(request, "expected-secret", "Unauthorized search sync request.").status).toBe(401);
    expect(authorizeJobRequest(
      new Request("https://market.example/api/search/sync", { headers: { authorization: "Bearer expected-secret" } }),
      "expected-secret",
      "Unauthorized search sync request."
    ).ok).toBe(true);
  });
});
