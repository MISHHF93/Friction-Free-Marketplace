import { getAdminAggregateMetrics, getAdminDirectoryRows } from "@/lib/admin/queries";
import { getAdminPageConfig, type AdminMetric, type AdminPageConfig, type AdminTableRow } from "@/lib/admin/platform";

type Row = Record<string, unknown>;

function rowsOf(data: unknown) {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function text(value: unknown, fallback = "—") {
  const rendered = String(value ?? "").trim();
  return rendered || fallback;
}

function shortId(value: unknown) {
  const rendered = text(value, "");
  return rendered.length > 10 ? `${rendered.slice(0, 8)}…` : rendered || "—";
}

function money(amount: unknown, currency = "USD") {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
}

function when(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function severity(status: string): NonNullable<AdminTableRow["severity"]> {
  const normalized = status.toLowerCase();
  if (["banned", "failed", "disputed", "chargeback", "critical", "removed"].includes(normalized)) return "critical";
  if (["suspended", "held", "high", "investigating", "refunded"].includes(normalized)) return "high";
  if (["pending", "draft", "open", "triaged", "queued", "authorized", "running"].includes(normalized)) return "medium";
  if (["active", "completed", "resolved", "published", "released", "succeeded", "paid"].includes(normalized)) return "positive";
  return "low";
}

function countMetric(label: string, value: number, detail: string): AdminMetric {
  return { label, value: value.toLocaleString("en-US"), detail };
}

function mapUsers(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const trust = Array.isArray(row.trust_scores) ? (row.trust_scores[0] as Row | undefined) : undefined;
    const status = text(row.status);
    return {
      subject: text(row.email, shortId(row.id)),
      role: text(row.role),
      status,
      trust: trust ? String(Math.round(Number(trust.score ?? 0))) : "—",
      action: "Review account",
      severity: severity(status),
      score: trust ? String(Math.round(Number(trust.score ?? 0))) : ""
    };
  });
}

function mapListings(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    return {
      subject: text(row.title, shortId(row.id)),
      seller: shortId(row.seller_id),
      risk: status,
      status,
      action: "Review listing",
      severity: severity(status)
    };
  });
}

function mapReports(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    return {
      subject: text(row.reason, shortId(row.id)),
      reporter: shortId(row.reporter_id),
      reason: status,
      sla: when(row.created_at),
      action: "Review report",
      severity: severity(status)
    };
  });
}

function mapDisputes(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    const transaction = Array.isArray(row.transactions) ? row.transactions[0] as Row | undefined : row.transactions as Row | undefined;
    return {
      id: text(row.id, ""),
      subject: text(row.reason, shortId(row.id)),
      buyer: shortId(transaction?.buyer_id ?? row.opened_by_id),
      seller: shortId(transaction?.seller_id),
      amount: money(transaction?.total_amount, text(transaction?.currency, "USD")),
      action: "Review dispute",
      severity: severity(status)
    };
  });
}

function mapFraud(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const score = String(row.risk_score ?? "0");
    const numeric = Number(score);
    return {
      subject: text(row.signal_type, shortId(row.id)),
      entity: shortId(row.user_id ?? row.listing_id ?? row.transaction_id),
      score,
      source: text(row.source),
      action: row.reviewed_at ? "Reviewed" : "Review signal",
      severity: numeric >= 85 ? "critical" : numeric >= 70 ? "high" : "medium"
    };
  });
}

function mapTransactions(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    return {
      subject: shortId(row.id),
      buyer: shortId(row.buyer_id),
      seller: shortId(row.seller_id),
      status,
      action: "Review transaction",
      severity: severity(status),
      amount: money(row.total_amount, text(row.currency, "USD"))
    };
  });
}

function mapPayments(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    return {
      subject: shortId(row.provider_payment_id ?? row.id),
      provider: text(row.provider),
      status,
      amount: money(row.amount, text(row.currency, "USD")),
      action: "Review payment",
      severity: severity(status)
    };
  });
}

function mapAi(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    const agent = Array.isArray(row.ai_agents) ? (row.ai_agents[0] as Row | undefined) : (row.ai_agents as Row | undefined);
    return {
      subject: text(row.task_type, shortId(row.id)),
      agent: text(agent?.name, "—"),
      status,
      latency: when(row.created_at),
      action: status === "failed" ? "Inspect error" : "Inspect task",
      severity: severity(status)
    };
  });
}

function mapSearch(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => ({
    subject: text(row.query, "(empty query)"),
    searches: "1",
    results: String(row.result_count ?? 0),
    ctr: row.clicked_listing_id ? "clicked" : "no click",
    action: "Review query",
    severity: Number(row.result_count ?? 0) === 0 ? "high" : "low"
  }));
}

function mapRevenue(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const currency = text(row.currency, "USD");
    const status = text(row.status);
    return {
      subject: shortId(row.id),
      gmv: money(row.total_amount, currency),
      fees: money(row.marketplace_fee_amount, currency),
      id: text(row.id, ""),
      refunds: row.status === "refunded" ? money(row.total_amount, currency) : money(0, currency),
      action: "Review order",
      severity: severity(status)
    };
  });
}

function mapTrust(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => {
    const status = text(row.status);
    return {
      subject: shortId(row.user_id),
      adjustment: String(row.adjustment ?? "0"),
      reason: text(row.reason),
      expires: row.expires_at ? when(row.expires_at) : "No expiry",
      action: "Review override",
      severity: severity(status)
    };
  });
}

function mapAudit(rows: Row[]): AdminTableRow[] {
  return rows.map((row) => ({
    subject: text(row.action, shortId(row.id)),
    actor: text(row.actor_type),
    target: text(row.table_name, "—"),
    when: when(row.created_at),
    action: "Inspect event",
    severity: "low" as const
  }));
}

export function adminTableRows(slug: string, rows: Row[]) {
  switch (slug) {
    case "users": return mapUsers(rows);
    case "listings": return mapListings(rows);
    case "reports": return mapReports(rows);
    case "disputes": return mapDisputes(rows);
    case "fraud-alerts": return mapFraud(rows);
    case "transactions": return mapTransactions(rows);
    case "payments": return mapPayments(rows);
    case "ai-tasks": return mapAi(rows);
    case "search-analytics": return mapSearch(rows);
    case "revenue": return mapRevenue(rows);
    case "trust-overrides": return mapTrust(rows);
    case "audit-logs": return mapAudit(rows);
    default: return [];
  }
}

function metricsFor(slug: string, rows: Row[]): AdminMetric[] {
  const total = rows.length;
  const open = rows.filter((row) => ["open", "pending", "triaged", "queued", "held", "disputed", "failed", "investigating"].includes(String(row.status ?? "").toLowerCase())).length;
  if (slug === "users") {
    return [
      countMetric("Accounts in view", total, "Latest accounts returned for this admin role."),
      countMetric("Active", rows.filter((row) => row.status === "active").length, "Active accounts in this result set."),
      countMetric("Restricted", rows.filter((row) => row.status === "suspended" || row.status === "banned").length, "Suspended or banned accounts in this result set.")
    ];
  }
  if (slug === "revenue" || slug === "transactions" || slug === "payments") {
    const currency = text(rows[0]?.currency, "USD");
    const amountKey = slug === "payments" ? "amount" : "total_amount";
    const sum = rows.reduce((totalAmount, row) => totalAmount + Number(row[amountKey] ?? 0), 0);
    return [
      countMetric("Records", total, "Latest records visible to this admin role."),
      { label: "Amount", value: money(sum, currency), detail: "Sum of the records currently in view." },
      countMetric("Needs review", open, "Open, held, disputed, or failed records in view.")
    ];
  }
  return [
    countMetric("Records", total, "Latest records visible to this admin role."),
    countMetric("Needs review", open, "Open or pending records in this result set."),
    countMetric("Shown", Math.min(total, 25), "The table is limited to the latest 25 records.")
  ];
}

function withoutSampleData(config: AdminPageConfig): AdminPageConfig {
  return {
    ...config,
    rows: [],
    metrics: config.metrics.map((metric) => ({ ...metric, value: "0", trend: undefined, detail: "No records in this queue." }))
  };
}

export async function getLiveAdminPage(slug: string, cursor?: string) {
  const config = getAdminPageConfig(slug);
  if (!config) return undefined;
  if (slug === "settings") return { config: withoutSampleData(config), nextCursor: null as string | null, loadError: null as string | null };
  try {
    const result = await getAdminDirectoryRows(slug, 25, cursor);
    if (result.error) {
      return {
        config: {
          ...withoutSampleData(config),
          metrics: [{ label: "Could not load", value: "—", detail: result.error.message }]
        },
        nextCursor: null,
        loadError: result.error.message as string
      };
    }
    const source = rowsOf(result.data);
    const last = source.at(-1);
    const nextCursor = source.length === 25 ? String(last?.updated_at ?? last?.created_at ?? "") || null : null;
    const aggregate = await getAdminAggregateMetrics(slug);
    const metrics = aggregate && "metrics" in aggregate && aggregate.metrics ? aggregate.metrics : metricsFor(slug, source);
    const loadError = aggregate && "error" in aggregate ? aggregate.error : null;
    return { config: { ...config, rows: adminTableRows(slug, source).map((row, index) => ({ ...row, id: row.id || text(source[index]?.id, "") })), metrics }, nextCursor, loadError };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The admin queue could not be loaded.";
    return {
      config: { ...withoutSampleData(config), metrics: [{ label: "Could not load", value: "—", detail: message }] },
      nextCursor: null,
      loadError: message
    };
  }
}
