import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  Landmark,
  ReceiptText,
  RefreshCcw,
  Scale,
  WalletCards,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ChartCard, MetricCard } from "@/components/ui-library/data-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { adminLinks } from "@/lib/admin/navigation";
import { formatMoney, getFinanceDashboardData, type FinanceDashboardData, type FinanceSectionKey } from "@/lib/financial/dashboard";
import { cn } from "@/lib/utils";

const sectionMeta: Record<FinanceSectionKey, { title: string; description: string; href: string; icon: typeof BarChart3; badge: string }> = {
  revenue: {
    title: "Revenue",
    description: "Recognized platform fee revenue, deferred fees, and take-rate quality.",
    href: "/admin/revenue",
    icon: CircleDollarSign,
    badge: "Executive P&L",
  },
  gmv: {
    title: "GMV",
    description: "Gross merchandise value, buyer-paid volume, order status mix, and conversion quality.",
    href: "/admin/gmv",
    icon: BarChart3,
    badge: "Marketplace volume",
  },
  fees: {
    title: "Fees",
    description: "Platform fee capture, deferred fees, fee leakage, and refund impact.",
    href: "/admin/fees",
    icon: BadgeDollarSign,
    badge: "Take rate",
  },
  payouts: {
    title: "Payouts",
    description: "Seller payables, paid payouts, pending releases, and failed transfers.",
    href: "/admin/payouts",
    icon: WalletCards,
    badge: "Seller settlement",
  },
  refunds: {
    title: "Refunds",
    description: "Refunded volume, refund rate, restored listings, and revenue reversals.",
    href: "/admin/refunds",
    icon: RefreshCcw,
    badge: "Buyer protection",
  },
  disputes: {
    title: "Disputes",
    description: "Open disputes, value at risk, dispute holds, and settlement exposure.",
    href: "/admin/disputes",
    icon: Scale,
    badge: "Risk exposure",
  },
  reconciliation: {
    title: "Reconciliation",
    description: "Ledger balances, Stripe cash, journal coverage, and finance exceptions.",
    href: "/admin/reconciliation",
    icon: FileCheck2,
    badge: "Close readiness",
  },
};

const sectionOrder: FinanceSectionKey[] = ["revenue", "gmv", "fees", "payouts", "refunds", "disputes", "reconciliation"];

export async function FinanceDashboardPage({ section }: { section: FinanceSectionKey }) {
  await requireAdminPagePermission("analytics.revenue", {
    loginNext: sectionMeta[section].href,
    deniedPath: "/admin",
  });
  const data = await getFinanceDashboardData(createAdminClient() as any, 100);
  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <DashboardShell
      title={`${meta.title} dashboard`}
      description={meta.description}
      kicker="Executive finance reporting"
      links={adminLinks}
      actions={
        <>
          <Button asChild variant="trust"><Link href="/api/admin/ledger">Ledger API</Link></Button>
          <Button asChild variant="surface"><Link href="/admin/transactions">Transactions <ArrowRight className="h-4 w-4" /></Link></Button>
        </>
      }
    >
      <section className="rounded-[2rem] border border-slate-900/10 bg-premium-dark p-5 text-white shadow-admin sm:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div>
            <Badge variant="dark" className="gap-2"><Icon className="h-3.5 w-3.5" /> {meta.badge}</Badge>
            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Executive finance command center</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Monitor revenue, GMV, fees, payouts, refunds, disputes, and reconciliation from the double-entry ledger and Stripe Connect payment flow.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Generated</p>
            <p className="mt-2 text-sm font-bold">{new Date(data.generatedAt).toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-300">Primary currency: {data.currency}</p>
          </div>
        </div>
      </section>

      <FinanceTabs active={section} />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {data.metrics.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
            tone={item.tone}
            trend={item.trend ? { label: item.trend, direction: "flat", tone: item.tone === "risk" ? "risk" : item.tone === "warning" ? "warning" : "trust" } : undefined}
            icon={metricIcon(item.label)}
          />
        ))}
      </div>

      <SectionDashboard section={section} data={data} />
    </DashboardShell>
  );
}

function FinanceTabs({ active }: { active: FinanceSectionKey }) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2" aria-label="Finance report sections">
      {sectionOrder.map((section) => {
        const meta = sectionMeta[section];
        const Icon = meta.icon;
        return (
          <Link
            key={section}
            href={meta.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground",
              active === section && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
            aria-current={active === section ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {meta.title}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionDashboard({ section, data }: { section: FinanceSectionKey; data: FinanceDashboardData }) {
  const meta = sectionMeta[section];
  const chartData = getSectionChartData(section, data);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {data.sectionMetrics[section].map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} detail={item.detail} tone={item.tone} icon={metricIcon(item.label)} />
          ))}
        </div>

        <FinanceDetailTable section={section} data={data} />
      </div>

      <div className="space-y-6">
        <ChartCard
          title={`${meta.title} composition`}
          description="Executive view of the selected reporting area."
          data={chartData}
          valueFormatter={(value) => section === "reconciliation" ? value.toLocaleString() : formatMoney(value, data.currency)}
          caption="Source: Supabase ledger, transactions, escrow payments, payouts, and disputes."
        />
        <ControlsCard section={section} />
      </div>
    </div>
  );
}

function getSectionChartData(section: FinanceSectionKey, data: FinanceDashboardData) {
  switch (section) {
    case "revenue":
      return data.charts.revenueMix;
    case "gmv":
      return data.charts.gmvStatus;
    case "fees":
      return data.charts.fees;
    case "payouts":
      return data.charts.payouts;
    case "refunds":
      return data.charts.refunds;
    case "disputes":
      return data.charts.disputes;
    case "reconciliation":
      return data.charts.reconciliation;
  }
}

function FinanceDetailTable({ section, data }: { section: FinanceSectionKey; data: FinanceDashboardData }) {
  if (section === "payouts") {
    return (
      <ExecutiveTable
        title="Seller payout monitor"
        description="Paid, pending, processing, and failed seller settlements."
        columns={["Payout", "Status", "Amount", "Scheduled", "Paid", "Failure"]}
        rows={data.tables.payouts.map((payout) => [payout.id, payout.status, formatMoney(Number(payout.amount), payout.currency), payout.scheduled_at ? new Date(payout.scheduled_at).toLocaleString() : "Not scheduled", payout.paid_at ? new Date(payout.paid_at).toLocaleString() : "Not paid", payout.failure_code ?? "None"])}
      />
    );
  }

  if (section === "refunds") {
    return (
      <ExecutiveTable
        title="Refund monitor"
        description="Payments with full or partial refunded amounts."
        columns={["Payment", "Status", "Amount", "Refunded", "Refunded at", "Failure"]}
        rows={data.tables.payments.filter((payment) => Number(payment.refunded_amount) > 0).map((payment) => [payment.id, payment.status, formatMoney(Number(payment.amount), payment.currency), formatMoney(Number(payment.refunded_amount), payment.currency), payment.refunded_at ? new Date(payment.refunded_at).toLocaleString() : "Pending", payment.failure_code ?? "None"])}
      />
    );
  }

  if (section === "disputes") {
    return (
      <ExecutiveTable
        title="Dispute exposure"
        description="Open and recently resolved disputes tied to transactions."
        columns={["Dispute", "Status", "Reason", "Transaction", "Opened", "Resolved"]}
        rows={data.tables.disputes.map((dispute) => [dispute.id, dispute.status, dispute.reason ?? "No reason captured", dispute.transaction_id, dispute.opened_at ? new Date(dispute.opened_at).toLocaleString() : "Unknown", dispute.resolved_at ? new Date(dispute.resolved_at).toLocaleString() : "Open"])}
      />
    );
  }

  if (section === "reconciliation") {
    return (
      <ExecutiveTable
        title="Reconciliation readiness"
        description="Close-readiness checks for ledger coverage, payout failures, and dispute exposure."
        columns={["Check", "Status", "Value", "Owner"]}
        rows={data.tables.reconciliation.map((item) => [item.check, item.status, item.value, item.owner])}
      />
    );
  }

  if (section === "fees") {
    return (
      <ExecutiveTable
        title="Fee ledger journals"
        description="Recent journals that recognize, defer, or reverse platform fees."
        columns={["Journal", "Event", "Currency", "Source", "Posted", "Description"]}
        rows={data.tables.ledger.filter((journal) => String(journal.event_type ?? "").includes("payment") || String(journal.event_type ?? "").includes("payout") || String(journal.event_type ?? "").includes("refund")).map((journal) => [String(journal.id), String(journal.event_type), String(journal.currency), `${journal.source_type}:${journal.source_id}`, journal.posted_at ? new Date(String(journal.posted_at)).toLocaleString() : "Unknown", String(journal.description ?? "No description")])}
      />
    );
  }

  return (
    <ExecutiveTable
      title={section === "gmv" ? "GMV transaction book" : "Revenue transaction book"}
      description="Recent marketplace transactions powering executive reporting."
      columns={["Transaction", "Status", "GMV", "Gross paid", "Fee", "Created"]}
      rows={data.tables.transactions.map((transaction) => [transaction.id, transaction.status, formatMoney(Number(transaction.item_amount), transaction.currency), formatMoney(Number(transaction.total_amount), transaction.currency), formatMoney(Number(transaction.marketplace_fee_amount), transaction.currency), new Date(transaction.created_at).toLocaleString()])}
    />
  );
}

function ExecutiveTable({ title, description, columns, rows }: { title: string; description: string; columns: string[]; rows: string[][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="table-scroll p-0">
        <table className="table-base table-density-compact">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.slice(0, 12).map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className={cellIndex === 0 ? "max-w-56 truncate font-semibold" : "text-muted-foreground"}>{cell}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="py-8 text-center text-muted-foreground">No finance records are available for this section yet.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ControlsCard({ section }: { section: FinanceSectionKey }) {
  const controls = {
    revenue: ["Review revenue recognition policy", "Export platform fee journals", "Compare deferred fee roll-forward"],
    gmv: ["Export transaction book", "Segment GMV by status", "Investigate cancelled high-value orders"],
    fees: ["Audit fee rule versions", "Review fee refunds", "Compare take-rate drift"],
    payouts: ["Review failed seller transfers", "Hold risky seller payouts", "Retry eligible payout failures"],
    refunds: ["Review high-value refunds", "Compare refund reasons", "Audit post-release reversals"],
    disputes: ["Prioritize evidence due", "Hold payout exposure", "Draft settlement decision"],
    reconciliation: ["Run Stripe reconciliation", "Review exceptions", "Export close package"],
  } satisfies Record<FinanceSectionKey, string[]>;

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader>
        <Badge variant="warning" className="w-fit"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Executive controls</Badge>
        <CardTitle>Recommended actions</CardTitle>
        <CardDescription>Finance actions should write audit records and require role-based permissions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {controls[section].map((control) => (
          <div key={control} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/70 p-3">
            <span className="text-sm font-bold text-amber-950">{control}</span>
            <Button size="sm" variant="outline">Review</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function metricIcon(label: string) {
  if (/gmv|gross|orders/i.test(label)) return Landmark;
  if (/payout|payable/i.test(label)) return WalletCards;
  if (/refund/i.test(label)) return RefreshCcw;
  if (/dispute|risk/i.test(label)) return Scale;
  if (/fee|take/i.test(label)) return BadgeDollarSign;
  if (/cash|ledger|reconciliation|journal/i.test(label)) return FileCheck2;
  if (/paid|payment/i.test(label)) return CreditCard;
  return Banknote;
}
