import type { SupabaseClient } from "@supabase/supabase-js";

export const ledgerAccounts = {
  stripeCash: "stripe_cash",
  sellerPayable: "seller_payable",
  platformFeeDeferred: "platform_fee_deferred",
  platformFeeRevenue: "platform_fee_revenue",
  refundsPayable: "refunds_payable",
  disputeHold: "dispute_hold",
  chargebackLoss: "chargeback_loss",
  stripeProcessingFees: "stripe_processing_fees",
  sellerTransferReversalReceivable: "seller_transfer_reversal_receivable",
  taxLiability: "tax_liability",
  shippingLiability: "shipping_liability",
} as const;

export type LedgerAccountCode = (typeof ledgerAccounts)[keyof typeof ledgerAccounts];

export type LedgerEntryInput = {
  accountCode: LedgerAccountCode;
  debit?: number;
  credit?: number;
  userId?: string | null;
  provider?: string | null;
  providerObjectId?: string | null;
  metadata?: Record<string, unknown>;
};

export type LedgerJournalInput = {
  transactionId?: string | null;
  sourceType: string;
  sourceId: string;
  eventType: string;
  currency: string;
  description?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  entries: LedgerEntryInput[];
};

export type LedgerBalanceRow = {
  accountCode: string;
  name?: string | null;
  accountType?: string | null;
  normalBalance: "debit" | "credit";
  category?: string | null;
  currency: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
};

type MoneyBreakdown = {
  totalAmount: number;
  sellerNetAmount: number;
  platformFeeAmount: number;
  currency: string;
  transactionId: string;
  buyerId?: string | null;
  sellerId?: string | null;
  providerPaymentId?: string | null;
  providerChargeId?: string | null;
};

function money(amount: number | string | null | undefined) {
  return Number(Number(amount ?? 0).toFixed(2));
}

function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

export function assertBalancedLedgerEntries(entries: LedgerEntryInput[]) {
  if (entries.length < 2) throw new Error("A ledger journal must contain at least two entries.");

  const totals = entries.reduce(
    (acc, entry) => {
      const debit = money(entry.debit);
      const credit = money(entry.credit);
      if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
        throw new Error(`Ledger entry for ${entry.accountCode} must have exactly one positive side.`);
      }
      acc.debits += debit;
      acc.credits += credit;
      return acc;
    },
    { debits: 0, credits: 0 }
  );

  if (money(totals.debits) !== money(totals.credits)) {
    throw new Error(`Ledger journal is not balanced: debits ${money(totals.debits)}, credits ${money(totals.credits)}.`);
  }

  return { debitTotal: money(totals.debits), creditTotal: money(totals.credits) };
}

export function calculateAccountBalances(entries: Array<LedgerBalanceRow | (LedgerEntryInput & { currency: string; normalBalance?: "debit" | "credit" })>) {
  const balances = new Map<string, LedgerBalanceRow>();

  for (const entry of entries) {
    const accountCode = entry.accountCode;
    const currency = normalizeCurrency(entry.currency);
    const key = `${accountCode}:${currency}`;
    const current = balances.get(key) ?? {
      accountCode,
      normalBalance: entry.normalBalance ?? "debit",
      currency,
      debitTotal: 0,
      creditTotal: 0,
      balance: 0,
    };
    current.debitTotal = money(current.debitTotal + money("debitTotal" in entry ? entry.debitTotal : entry.debit));
    current.creditTotal = money(current.creditTotal + money("creditTotal" in entry ? entry.creditTotal : entry.credit));
    current.balance = current.normalBalance === "debit"
      ? money(current.debitTotal - current.creditTotal)
      : money(current.creditTotal - current.debitTotal);
    balances.set(key, current);
  }

  return [...balances.values()].sort((a, b) => `${a.currency}:${a.accountCode}`.localeCompare(`${b.currency}:${b.accountCode}`));
}

function serializeEntries(entries: LedgerEntryInput[]) {
  return entries.map((entry) => ({
    account_code: entry.accountCode,
    debit_amount: money(entry.debit),
    credit_amount: money(entry.credit),
    user_id: entry.userId ?? null,
    provider: entry.provider ?? null,
    provider_object_id: entry.providerObjectId ?? null,
    metadata: entry.metadata ?? {},
  }));
}

export async function postLedgerJournal(supabase: SupabaseClient<any>, input: LedgerJournalInput) {
  assertBalancedLedgerEntries(input.entries);
  const { data, error } = await supabase.rpc("post_financial_journal", {
    p_transaction_id: input.transactionId ?? null,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_event_type: input.eventType,
    p_currency: normalizeCurrency(input.currency),
    p_description: input.description ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {},
    p_entries: serializeEntries(input.entries),
  });
  if (error) throw error;
  return data as string;
}

export function buildCaptureJournal(input: MoneyBreakdown): LedgerJournalInput {
  return {
    transactionId: input.transactionId,
    sourceType: "stripe_payment_intent",
    sourceId: input.providerPaymentId ?? input.transactionId,
    eventType: "payment_captured",
    currency: input.currency,
    description: "Captured buyer funds into Stripe cash and recognized seller/platform liabilities.",
    idempotencyKey: `ledger:capture:${input.providerPaymentId ?? input.transactionId}`,
    metadata: { provider_charge_id: input.providerChargeId ?? null },
    entries: [
      { accountCode: ledgerAccounts.stripeCash, debit: input.totalAmount, provider: "stripe", providerObjectId: input.providerChargeId ?? input.providerPaymentId ?? null },
      { accountCode: ledgerAccounts.sellerPayable, credit: input.sellerNetAmount, userId: input.sellerId ?? null, provider: "stripe", providerObjectId: input.providerPaymentId ?? null },
      { accountCode: ledgerAccounts.platformFeeDeferred, credit: input.platformFeeAmount, provider: "stripe", providerObjectId: input.providerPaymentId ?? null },
    ],
  };
}

export function buildReleaseJournal(input: MoneyBreakdown & { providerTransferId?: string | null }): LedgerJournalInput {
  return {
    transactionId: input.transactionId,
    sourceType: "stripe_transfer",
    sourceId: input.providerTransferId ?? input.transactionId,
    eventType: "seller_payout_paid",
    currency: input.currency,
    description: "Released seller payable and recognized platform fee revenue.",
    idempotencyKey: `ledger:release:${input.providerTransferId ?? input.transactionId}`,
    metadata: { provider_payment_id: input.providerPaymentId ?? null },
    entries: [
      { accountCode: ledgerAccounts.sellerPayable, debit: input.sellerNetAmount, userId: input.sellerId ?? null, provider: "stripe", providerObjectId: input.providerTransferId ?? null },
      { accountCode: ledgerAccounts.stripeCash, credit: input.sellerNetAmount, provider: "stripe", providerObjectId: input.providerTransferId ?? null },
      { accountCode: ledgerAccounts.platformFeeDeferred, debit: input.platformFeeAmount, provider: "stripe", providerObjectId: input.providerPaymentId ?? null },
      { accountCode: ledgerAccounts.platformFeeRevenue, credit: input.platformFeeAmount, provider: "stripe", providerObjectId: input.providerPaymentId ?? null },
    ],
  };
}

export function buildRefundJournal(input: MoneyBreakdown & { refundAmount: number; providerRefundId?: string | null }): LedgerJournalInput {
  const refundAmount = money(input.refundAmount);
  const sellerShare = input.totalAmount > 0 ? money(refundAmount * (input.sellerNetAmount / input.totalAmount)) : 0;
  const feeShare = money(refundAmount - sellerShare);

  return {
    transactionId: input.transactionId,
    sourceType: "stripe_refund",
    sourceId: input.providerRefundId ?? input.transactionId,
    eventType: "refund_succeeded",
    currency: input.currency,
    description: "Refunded captured funds before seller release.",
    idempotencyKey: `ledger:refund:${input.providerRefundId ?? input.transactionId}:${refundAmount}`,
    metadata: { refund_amount: refundAmount, provider_payment_id: input.providerPaymentId ?? null },
    entries: [
      { accountCode: ledgerAccounts.sellerPayable, debit: sellerShare, userId: input.sellerId ?? null, provider: "stripe", providerObjectId: input.providerRefundId ?? null },
      { accountCode: ledgerAccounts.platformFeeDeferred, debit: feeShare, provider: "stripe", providerObjectId: input.providerRefundId ?? null },
      { accountCode: ledgerAccounts.stripeCash, credit: refundAmount, provider: "stripe", providerObjectId: input.providerRefundId ?? null },
    ].filter((entry) => money(entry.debit) > 0 || money(entry.credit) > 0),
  };
}

export function buildDisputeHoldJournal(input: MoneyBreakdown & { providerDisputeId?: string | null; disputedAmount?: number | null }): LedgerJournalInput {
  const disputedAmount = Math.min(money(input.disputedAmount ?? input.sellerNetAmount), money(input.sellerNetAmount));
  return {
    transactionId: input.transactionId,
    sourceType: "stripe_dispute",
    sourceId: input.providerDisputeId ?? input.transactionId,
    eventType: "dispute_hold",
    currency: input.currency,
    description: "Moved seller payable into dispute hold.",
    idempotencyKey: `ledger:dispute-hold:${input.providerDisputeId ?? input.transactionId}`,
    metadata: { disputed_amount: disputedAmount, provider_payment_id: input.providerPaymentId ?? null },
    entries: [
      { accountCode: ledgerAccounts.sellerPayable, debit: disputedAmount, userId: input.sellerId ?? null, provider: "stripe", providerObjectId: input.providerDisputeId ?? null },
      { accountCode: ledgerAccounts.disputeHold, credit: disputedAmount, userId: input.sellerId ?? null, provider: "stripe", providerObjectId: input.providerDisputeId ?? null },
    ],
  };
}
