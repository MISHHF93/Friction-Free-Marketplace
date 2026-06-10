import type { SupabaseClient } from "@supabase/supabase-js";
import { getLedgerReport, type LedgerReport } from "@/lib/financial/reports";

export type FinanceSectionKey = "revenue" | "gmv" | "fees" | "payouts" | "refunds" | "disputes" | "reconciliation";

type MoneyMap = Record<string, number>;

type TransactionRow = {
  id: string;
  status: string;
  item_amount: number;
  shipping_amount: number;
  tax_amount: number;
  marketplace_fee_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

type PaymentRow = {
  id: string;
  transaction_id: string;
  status: string;
  amount: number;
  platform_fee_amount: number;
  seller_net_amount: number;
  refunded_amount: number;
  currency: string;
  authorized_at: string | null;
  captured_at: string | null;
  held_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  failure_code: string | null;
};

type PayoutRow = {
  id: string;
  transaction_id: string;
  seller_id: string;
  status: string;
  amount: number;
  currency: string;
  scheduled_at: string | null;
  paid_at: string | null;
  failure_code: string | null;
};

type DisputeRow = {
  id: string;
  transaction_id: string;
  opened_by_id: string;
  respondent_id?: string | null;
  status: string;
  reason: string | null;
  created_at?: string;
  opened_at?: string;
  resolved_at?: string | null;
  metadata?: unknown;
};

export type FinanceMetric = {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  tone?: "commerce" | "trust" | "ai" | "premium" | "warning" | "risk";
};

export type FinanceChartDatum = {
  label: string;
  value: number;
  tone?: "commerce" | "trust" | "ai" | "premium" | "warning" | "risk";
};

export type FinanceDashboardData = {
  generatedAt: string;
  currency: string;
  metrics: FinanceMetric[];
  sectionMetrics: Record<FinanceSectionKey, FinanceMetric[]>;
  charts: {
    revenueMix: FinanceChartDatum[];
    gmvStatus: FinanceChartDatum[];
    fees: FinanceChartDatum[];
    payouts: FinanceChartDatum[];
    refunds: FinanceChartDatum[];
    disputes: FinanceChartDatum[];
    reconciliation: FinanceChartDatum[];
  };
  tables: {
    transactions: TransactionRow[];
    payments: PaymentRow[];
    payouts: PayoutRow[];
    disputes: DisputeRow[];
    ledger: LedgerReport["recentJournals"];
    reconciliation: Array<{ check: string; status: string; value: string; owner: string }>;
  };
  totals: {
    gmv: MoneyMap;
    grossPaid: MoneyMap;
    revenue: MoneyMap;
    deferredFees: MoneyMap;
    payables: MoneyMap;
    payoutsPaid: MoneyMap;
    payoutsPending: MoneyMap;
    refunds: MoneyMap;
    disputeExposure: MoneyMap;
    stripeCash: MoneyMap;
  };
};

function money(value: unknown) {
  return Number(Number(value ?? 0).toFixed(2));
}

function add(map: MoneyMap, currency: string, value: unknown) {
  const normalizedCurrency = (currency || "USD").toUpperCase();
  map[normalizedCurrency] = money((map[normalizedCurrency] ?? 0) + money(value));
}

export function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function primaryCurrency(...maps: MoneyMap[]) {
  const currencies = maps.flatMap((map) => Object.keys(map));
  return currencies.includes("USD") ? "USD" : currencies[0] ?? "USD";
}

function valueFor(map: MoneyMap, currency: string) {
  return money(map[currency] ?? 0);
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function statusCount(rows: Array<{ status: string }>, status: string | string[]) {
  const statuses = Array.isArray(status) ? status : [status];
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function sumRows<T extends { currency: string }>(rows: T[], selector: (row: T) => number) {
  const totals: MoneyMap = {};
  rows.forEach((row) => add(totals, row.currency, selector(row)));
  return totals;
}

function metric(label: string, value: string, detail: string, tone: FinanceMetric["tone"] = "commerce", trend?: string): FinanceMetric {
  return { label, value, detail, tone, trend };
}

function financeRowsByStatus(rows: Array<{ status: string; amount?: number; total_amount?: number; currency: string }>, statuses: string[]) {
  return statuses.map((status) => ({
    label: status.replace(/_/g, " "),
    value: money(rows.filter((row) => row.status === status).reduce((sum, row) => sum + money(row.amount ?? row.total_amount), 0)),
    tone: status.includes("failed") || status.includes("disputed") ? "risk" as const : status.includes("pending") || status.includes("held") ? "warning" as const : "trust" as const,
  }));
}

export async function getFinanceDashboardData(supabase: SupabaseClient<any>, limit = 100): Promise<FinanceDashboardData> {
  const ledger = await getLedgerReport(supabase, limit);
  const [transactionsResult, paymentsResult, payoutsResult, disputesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,status,item_amount,shipping_amount,tax_amount,marketplace_fee_amount,total_amount,currency,created_at,completed_at,cancelled_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("escrow_payments")
      .select("id,transaction_id,status,amount,platform_fee_amount,seller_net_amount,refunded_amount,currency,authorized_at,captured_at,held_at,released_at,refunded_at,failure_code")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("payouts")
      .select("id,transaction_id,seller_id,status,amount,currency,scheduled_at,paid_at,failure_code")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("disputes")
      .select("id,transaction_id,opened_by_id,respondent_id,status,reason,opened_at,resolved_at,metadata")
      .order("opened_at", { ascending: false })
      .limit(limit),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (payoutsResult.error) throw payoutsResult.error;
  if (disputesResult.error) throw disputesResult.error;

  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const payouts = (payoutsResult.data ?? []) as PayoutRow[];
  const disputes = (disputesResult.data ?? []) as DisputeRow[];

  const completedTransactions = transactions.filter((transaction) => transaction.status === "completed");
  const gmv = sumRows(completedTransactions, (transaction) => money(transaction.item_amount));
  const grossPaid = sumRows(transactions.filter((transaction) => !["cancelled", "refunded"].includes(transaction.status)), (transaction) => money(transaction.total_amount));
  const fallbackRevenue = sumRows(completedTransactions, (transaction) => money(transaction.marketplace_fee_amount));
  const refunds = sumRows(payments, (payment) => money(payment.refunded_amount));
  const payoutsPaid = sumRows(payouts.filter((payout) => payout.status === "paid"), (payout) => money(payout.amount));
  const payoutsPending = sumRows(payouts.filter((payout) => ["pending", "processing"].includes(payout.status)), (payout) => money(payout.amount));
  const disputeTransactionIds = new Set(disputes.filter((dispute) => !["closed", "resolved_buyer", "resolved_seller"].includes(dispute.status)).map((dispute) => dispute.transaction_id));
  const disputeExposure = sumRows(transactions.filter((transaction) => disputeTransactionIds.has(transaction.id)), (transaction) => money(transaction.total_amount));

  const ledgerSummary = ledger.summary[0];
  const currency = primaryCurrency(gmv, grossPaid, fallbackRevenue, refunds, payoutsPaid, payoutsPending, disputeExposure, ledgerSummary ? { [ledgerSummary.currency]: ledgerSummary.revenue } : {});
  const revenue = ledgerSummary?.currency === currency && ledgerSummary.revenue > 0 ? ledgerSummary.revenue : valueFor(fallbackRevenue, currency);
  const deferredFees = ledgerSummary?.currency === currency ? ledgerSummary.deferredFees : money(payments.filter((payment) => ["authorized", "held"].includes(payment.status)).reduce((sum, payment) => sum + money(payment.platform_fee_amount), 0));
  const payables = ledgerSummary?.currency === currency ? ledgerSummary.payables : money(payments.filter((payment) => payment.status === "held").reduce((sum, payment) => sum + money(payment.seller_net_amount), 0));
  const stripeCash = ledgerSummary?.currency === currency ? ledgerSummary.stripeCash : money(payments.filter((payment) => ["authorized", "held"].includes(payment.status)).reduce((sum, payment) => sum + money(payment.amount), 0));
  const gmvValue = valueFor(gmv, currency);
  const grossValue = valueFor(grossPaid, currency);
  const refundValue = valueFor(refunds, currency);
  const payoutPaidValue = valueFor(payoutsPaid, currency);
  const payoutPendingValue = valueFor(payoutsPending, currency);
  const disputeExposureValue = valueFor(disputeExposure, currency);
  const takeRate = rate(revenue, gmvValue);
  const refundRate = rate(refundValue, grossValue);
  const disputeRate = rate(disputes.length, Math.max(transactions.length, 1));
  const reconciliationExceptions = ledger.balances.length === 0 ? 1 : 0;

  return {
    generatedAt: new Date().toISOString(),
    currency,
    metrics: [
      metric("Net revenue", formatMoney(revenue, currency), `${takeRate}% take rate on completed GMV.`, "trust"),
      metric("GMV", formatMoney(gmvValue, currency), `${completedTransactions.length} completed transactions in scope.`, "commerce"),
      metric("Seller payables", formatMoney(payables, currency), "Held seller net awaiting release or settlement.", payables > 0 ? "warning" : "trust"),
      metric("Refund rate", `${refundRate}%`, `${formatMoney(refundValue, currency)} refunded against gross paid.`, refundRate > 5 ? "warning" : "premium"),
    ],
    sectionMetrics: {
      revenue: [
        metric("Recognized revenue", formatMoney(revenue, currency), "Platform fees recognized after transaction completion.", "trust"),
        metric("Deferred fees", formatMoney(deferredFees, currency), "Fees collected but not yet recognized as revenue.", "warning"),
        metric("Take rate", `${takeRate}%`, "Recognized revenue divided by completed item GMV.", "ai"),
      ],
      gmv: [
        metric("Completed GMV", formatMoney(gmvValue, currency), "Completed item amount excluding fees, tax, and shipping.", "commerce"),
        metric("Gross paid", formatMoney(grossValue, currency), "Buyer-paid total currently in non-cancelled flow.", "premium"),
        metric("Completed orders", completedTransactions.length.toLocaleString(), `${transactions.length} transactions loaded in reporting window.`, "trust"),
      ],
      fees: [
        metric("Recognized fees", formatMoney(revenue, currency), "Revenue moved from deferred fees to platform fee revenue.", "trust"),
        metric("Deferred fees", formatMoney(deferredFees, currency), "Fee liability on authorized or held payments.", "warning"),
        metric("Fee capture rate", `${rate(revenue + deferredFees, grossValue)}%`, "Recognized plus deferred fees over buyer gross paid.", "ai"),
      ],
      payouts: [
        metric("Paid payouts", formatMoney(payoutPaidValue, currency), `${statusCount(payouts, "paid")} completed seller payouts.`, "trust"),
        metric("Pending payouts", formatMoney(payoutPendingValue, currency), `${statusCount(payouts, ["pending", "processing"])} payouts not finalized.`, "warning"),
        metric("Failed payouts", statusCount(payouts, "failed").toLocaleString(), "Seller account or transfer issues requiring finance review.", statusCount(payouts, "failed") > 0 ? "risk" : "trust"),
      ],
      refunds: [
        metric("Refunded amount", formatMoney(refundValue, currency), "Total refunded amount mirrored from escrow payments.", refundValue > 0 ? "warning" : "trust"),
        metric("Refund rate", `${refundRate}%`, "Refunded amount divided by gross paid.", refundRate > 5 ? "warning" : "premium"),
        metric("Refunded payments", payments.filter((payment) => money(payment.refunded_amount) > 0).length.toLocaleString(), "Payments with full or partial refunds.", "ai"),
      ],
      disputes: [
        metric("Open disputes", disputes.filter((dispute) => !["closed", "resolved_buyer", "resolved_seller"].includes(dispute.status)).length.toLocaleString(), "Disputes not yet closed or resolved.", "warning"),
        metric("Value at risk", formatMoney(disputeExposureValue, currency), "Gross value tied to open dispute transactions.", disputeExposureValue > 0 ? "risk" : "trust"),
        metric("Dispute rate", `${disputeRate}%`, "Dispute count divided by transaction count in scope.", disputeRate > 2 ? "warning" : "premium"),
      ],
      reconciliation: [
        metric("Stripe cash", formatMoney(stripeCash, currency), "Ledger Stripe cash balance from financial account balances.", "premium"),
        metric("Ledger journals", ledger.recentJournals.length.toLocaleString(), "Recent financial journals available for review.", "trust"),
        metric("Exceptions", reconciliationExceptions.toLocaleString(), reconciliationExceptions ? "Ledger has not been seeded for this environment." : "No synthetic exceptions detected by dashboard checks.", reconciliationExceptions ? "warning" : "trust"),
      ],
    },
    charts: {
      revenueMix: [
        { label: "Recognized revenue", value: revenue, tone: "trust" },
        { label: "Deferred fees", value: deferredFees, tone: "warning" },
        { label: "Seller payables", value: payables, tone: "ai" },
      ],
      gmvStatus: financeRowsByStatus(transactions, ["completed", "escrowed", "paid", "pending_payment", "disputed", "refunded"]),
      fees: [
        { label: "Recognized fees", value: revenue, tone: "trust" },
        { label: "Deferred fees", value: deferredFees, tone: "warning" },
        { label: "Refunded amount", value: refundValue, tone: "risk" },
      ],
      payouts: financeRowsByStatus(payouts, ["paid", "processing", "pending", "failed", "cancelled"]),
      refunds: [
        { label: "Refunded", value: refundValue, tone: refundValue > 0 ? "warning" : "trust" },
        { label: "Gross paid", value: grossValue, tone: "commerce" },
      ],
      disputes: financeRowsByStatus(transactions.filter((transaction) => disputeTransactionIds.has(transaction.id)), ["disputed", "escrowed", "completed"]),
      reconciliation: [
        { label: "Matched ledger journals", value: ledger.recentJournals.length, tone: "trust" },
        { label: "Balance accounts", value: ledger.balances.length, tone: "ai" },
        { label: "Open exceptions", value: reconciliationExceptions, tone: reconciliationExceptions ? "warning" : "trust" },
      ],
    },
    tables: {
      transactions,
      payments,
      payouts,
      disputes,
      ledger: ledger.recentJournals,
      reconciliation: [
        { check: "Ledger account balances", status: ledger.balances.length > 0 ? "passing" : "attention", value: `${ledger.balances.length} accounts`, owner: "Finance" },
        { check: "Recent journals", status: ledger.recentJournals.length > 0 ? "passing" : "attention", value: `${ledger.recentJournals.length} journals`, owner: "Finance" },
        { check: "Payout failures", status: statusCount(payouts, "failed") > 0 ? "attention" : "passing", value: `${statusCount(payouts, "failed")} failed`, owner: "Payments" },
        { check: "Open disputes", status: disputeExposureValue > 0 ? "attention" : "passing", value: formatMoney(disputeExposureValue, currency), owner: "Trust" },
      ],
    },
    totals: {
      gmv,
      grossPaid,
      revenue: { [currency]: revenue },
      deferredFees: { [currency]: deferredFees },
      payables: { [currency]: payables },
      payoutsPaid,
      payoutsPending,
      refunds,
      disputeExposure,
      stripeCash: { [currency]: stripeCash },
    },
  };
}
