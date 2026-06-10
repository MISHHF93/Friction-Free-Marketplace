import { describe, expect, it } from "vitest";
import {
  assertBalancedLedgerEntries,
  buildCaptureJournal,
  buildRefundJournal,
  buildReleaseJournal,
  ledgerAccounts,
} from "@/lib/financial/ledger";
import { summarizeLedgerBalances } from "@/lib/financial/reports";

describe("marketplace financial ledger", () => {
  it("rejects unbalanced journals", () => {
    expect(() => assertBalancedLedgerEntries([
      { accountCode: ledgerAccounts.stripeCash, debit: 100 },
      { accountCode: ledgerAccounts.sellerPayable, credit: 99 },
    ])).toThrow(/not balanced/);
  });

  it("builds a balanced capture journal for held funds", () => {
    const journal = buildCaptureJournal({
      transactionId: "tx",
      totalAmount: 105,
      sellerNetAmount: 100,
      platformFeeAmount: 5,
      currency: "usd",
      sellerId: "seller",
      providerPaymentId: "pi_test",
      providerChargeId: "ch_test",
    });

    expect(assertBalancedLedgerEntries(journal.entries)).toEqual({ debitTotal: 105, creditTotal: 105 });
    expect(journal.entries).toContainEqual(expect.objectContaining({ accountCode: ledgerAccounts.stripeCash, debit: 105 }));
    expect(journal.entries).toContainEqual(expect.objectContaining({ accountCode: ledgerAccounts.sellerPayable, credit: 100 }));
    expect(journal.entries).toContainEqual(expect.objectContaining({ accountCode: ledgerAccounts.platformFeeDeferred, credit: 5 }));
  });

  it("builds a balanced release journal that recognizes revenue", () => {
    const journal = buildReleaseJournal({
      transactionId: "tx",
      totalAmount: 105,
      sellerNetAmount: 100,
      platformFeeAmount: 5,
      currency: "USD",
      sellerId: "seller",
      providerPaymentId: "pi_test",
      providerTransferId: "tr_test",
    });

    expect(assertBalancedLedgerEntries(journal.entries)).toEqual({ debitTotal: 105, creditTotal: 105 });
    expect(journal.entries).toContainEqual(expect.objectContaining({ accountCode: ledgerAccounts.platformFeeRevenue, credit: 5 }));
  });

  it("prorates refunds between seller payable and deferred fees", () => {
    const journal = buildRefundJournal({
      transactionId: "tx",
      totalAmount: 105,
      sellerNetAmount: 100,
      platformFeeAmount: 5,
      refundAmount: 52.5,
      currency: "USD",
      sellerId: "seller",
      providerRefundId: "re_test",
    });

    expect(assertBalancedLedgerEntries(journal.entries)).toEqual({ debitTotal: 52.5, creditTotal: 52.5 });
    expect(journal.entries).toContainEqual(expect.objectContaining({ accountCode: ledgerAccounts.stripeCash, credit: 52.5 }));
  });

  it("summarizes balances by financial role", () => {
    const summary = summarizeLedgerBalances([
      { accountCode: "platform_fee_revenue", normalBalance: "credit", currency: "USD", debitTotal: 0, creditTotal: 12, balance: 12 },
      { accountCode: "seller_payable", normalBalance: "credit", currency: "USD", debitTotal: 40, creditTotal: 100, balance: 60 },
      { accountCode: "stripe_cash", normalBalance: "debit", currency: "USD", debitTotal: 120, creditTotal: 40, balance: 80 },
      { accountCode: "dispute_hold", normalBalance: "credit", currency: "USD", debitTotal: 0, creditTotal: 25, balance: 25 },
    ]);

    expect(summary).toEqual([
      expect.objectContaining({
        currency: "USD",
        revenue: 12,
        payables: 60,
        stripeCash: 80,
        disputeHolds: 25,
      }),
    ]);
  });
});
