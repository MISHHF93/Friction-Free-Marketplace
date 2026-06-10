import type { SupabaseClient } from "@supabase/supabase-js";
import type { LedgerBalanceRow } from "@/lib/financial/ledger";

export type LedgerReport = {
  generatedAt: string;
  balances: LedgerBalanceRow[];
  summary: Array<{
    currency: string;
    revenue: number;
    deferredFees: number;
    payables: number;
    stripeCash: number;
    payouts: number;
    refunds: number;
    disputeHolds: number;
    chargebackLosses: number;
    processingFees: number;
  }>;
  recentJournals: Array<Record<string, unknown>>;
};

function money(value: unknown) {
  return Number(Number(value ?? 0).toFixed(2));
}

function normalizeBalance(row: any): LedgerBalanceRow {
  return {
    accountCode: row.account_code,
    name: row.name,
    accountType: row.account_type,
    normalBalance: row.normal_balance,
    category: row.category,
    currency: row.currency,
    debitTotal: money(row.debit_total),
    creditTotal: money(row.credit_total),
    balance: money(row.balance),
  };
}

function emptyCurrencySummary(currency: string) {
  return {
    currency,
    revenue: 0,
    deferredFees: 0,
    payables: 0,
    stripeCash: 0,
    payouts: 0,
    refunds: 0,
    disputeHolds: 0,
    chargebackLosses: 0,
    processingFees: 0,
  };
}

export function summarizeLedgerBalances(balances: LedgerBalanceRow[]) {
  const summaries = new Map<string, ReturnType<typeof emptyCurrencySummary>>();

  for (const balance of balances) {
    const summary = summaries.get(balance.currency) ?? emptyCurrencySummary(balance.currency);
    switch (balance.accountCode) {
      case "platform_fee_revenue":
        summary.revenue = money(balance.balance);
        break;
      case "platform_fee_deferred":
        summary.deferredFees = money(balance.balance);
        break;
      case "seller_payable":
        summary.payables = money(balance.balance);
        break;
      case "stripe_cash":
        summary.stripeCash = money(balance.balance);
        break;
      case "dispute_hold":
        summary.disputeHolds = money(balance.balance);
        break;
      case "chargeback_loss":
        summary.chargebackLosses = money(balance.balance);
        break;
      case "stripe_processing_fees":
        summary.processingFees = money(balance.balance);
        break;
      default:
        break;
    }
    summaries.set(balance.currency, summary);
  }

  return [...summaries.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function getLedgerReport(supabase: SupabaseClient<any>, limit = 50): Promise<LedgerReport> {
  const [balancesResult, journalsResult, payoutsResult, refundsResult] = await Promise.all([
    supabase.from("financial_account_balances").select("*").order("currency", { ascending: true }).order("account_code", { ascending: true }),
    supabase
      .from("financial_ledger_journals")
      .select("id,transaction_id,source_type,source_id,event_type,currency,description,idempotency_key,posted_at,metadata")
      .order("posted_at", { ascending: false })
      .limit(limit),
    supabase.from("payouts").select("amount,currency,status").in("status", ["paid", "processing", "pending"]),
    supabase.from("escrow_payments").select("refunded_amount,currency,status").gt("refunded_amount", 0),
  ]);

  if (balancesResult.error) throw balancesResult.error;
  if (journalsResult.error) throw journalsResult.error;
  if (payoutsResult.error) throw payoutsResult.error;
  if (refundsResult.error) throw refundsResult.error;

  const balances = (balancesResult.data ?? []).map(normalizeBalance);
  const summary = summarizeLedgerBalances(balances);

  for (const payout of payoutsResult.data ?? []) {
    const currency = String(payout.currency ?? "USD");
    const row = summary.find((item) => item.currency === currency) ?? emptyCurrencySummary(currency);
    row.payouts = money(row.payouts + money(payout.amount));
    if (!summary.includes(row)) summary.push(row);
  }

  for (const refund of refundsResult.data ?? []) {
    const currency = String(refund.currency ?? "USD");
    const row = summary.find((item) => item.currency === currency) ?? emptyCurrencySummary(currency);
    row.refunds = money(row.refunds + money(refund.refunded_amount));
    if (!summary.includes(row)) summary.push(row);
  }

  return {
    generatedAt: new Date().toISOString(),
    balances,
    summary: summary.sort((a, b) => a.currency.localeCompare(b.currency)),
    recentJournals: journalsResult.data ?? [],
  };
}
