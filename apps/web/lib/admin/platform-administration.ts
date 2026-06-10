import { createAdminClient } from "@/lib/supabase/admin";
import { can, permissionLabels, rolePermissions, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";
import { recordAdminAction } from "@/lib/admin/queries";

type ServiceDb = ReturnType<typeof createAdminClient> & {
  from(table: string): any;
  rpc(fn: string, args?: Record<string, unknown>): any;
};

export type PlatformAdminAreaKey = "users" | "listings" | "transactions" | "finance" | "fraud" | "ai" | "reports";

export type PlatformAdminArea = {
  key: PlatformAdminAreaKey;
  label: string;
  href: string;
  description: string;
  readPermission: AdminPermission;
  writePermission: AdminPermission;
  auditAction: string;
  apiRoute: string;
  owner: "Support" | "Moderation" | "Finance" | "Risk" | "AI Ops";
};

export type PlatformAreaSummary = PlatformAdminArea & {
  metrics: Array<{ label: string; value: string; detail: string; tone: "default" | "positive" | "warning" | "risk" | "ai" }>;
  rows: Array<Record<string, string>>;
  allowed: {
    read: boolean;
    write: boolean;
  };
};

export type PlatformAdministrationData = {
  generatedAt: string;
  areas: PlatformAreaSummary[];
  rbac: Array<{
    role: AdminRole;
    permissions: Array<{ key: AdminPermission; label: string }>;
  }>;
  audit: Array<Record<string, unknown>>;
};

export const platformAdminAreas: PlatformAdminArea[] = [
  {
    key: "users",
    label: "Users",
    href: "/admin/users",
    description: "Account status, verification, restrictions, trust scores, and support context.",
    readPermission: "users.read",
    writePermission: "users.write",
    auditAction: "user.status_change",
    apiRoute: "/api/admin/users",
    owner: "Support",
  },
  {
    key: "listings",
    label: "Listings",
    href: "/admin/listings",
    description: "Listing moderation, policy decisions, media review, and seller remediation.",
    readPermission: "listings.moderate",
    writePermission: "listings.moderate",
    auditAction: "listing.moderation_decision",
    apiRoute: "/api/admin/listings",
    owner: "Moderation",
  },
  {
    key: "transactions",
    label: "Transactions",
    href: "/admin/transactions",
    description: "Order state, escrow, disputes, refunds, releases, and payment lifecycle.",
    readPermission: "transactions.monitor",
    writePermission: "transactions.monitor",
    auditAction: "transaction.admin_note",
    apiRoute: "/api/admin/transactions",
    owner: "Finance",
  },
  {
    key: "finance",
    label: "Finance",
    href: "/admin/revenue",
    description: "GMV, revenue, fees, payouts, refunds, disputes, ledger, and reconciliation.",
    readPermission: "analytics.revenue",
    writePermission: "payments.monitor",
    auditAction: "finance.admin_review",
    apiRoute: "/api/admin/platform?area=finance",
    owner: "Finance",
  },
  {
    key: "fraud",
    label: "Fraud",
    href: "/admin/fraud-alerts",
    description: "Fraud signals, risk flags, scam messages, duplicate images, and containment.",
    readPermission: "fraud.review",
    writePermission: "fraud.review",
    auditAction: "fraud.disposition",
    apiRoute: "/api/admin/fraud-alerts",
    owner: "Risk",
  },
  {
    key: "ai",
    label: "AI",
    href: "/admin/ai-tasks",
    description: "Agent runs, moderation automation, errors, cost, latency, and safety audit.",
    readPermission: "ai.monitor",
    writePermission: "ai.monitor",
    auditAction: "ai.admin_review",
    apiRoute: "/api/admin/ai-tasks",
    owner: "AI Ops",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/admin/reports",
    description: "User, listing, message, transaction, and safety reports with SLA ownership.",
    readPermission: "reports.review",
    writePermission: "reports.review",
    auditAction: "report.disposition",
    apiRoute: "/api/admin/reports",
    owner: "Support",
  },
];

function serviceDb() {
  return createAdminClient() as ServiceDb;
}

function countValue(result: { count: number | null }) {
  return (result.count ?? 0).toLocaleString();
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function sumAmounts(rows: Array<{ amount?: number | string | null; total_amount?: number | string | null; marketplace_fee_amount?: number | string | null }>, key: "amount" | "total_amount" | "marketplace_fee_amount") {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function rbacMatrix() {
  return Object.entries(rolePermissions).map(([role, permissions]) => ({
    role: role as AdminRole,
    permissions: permissions.map((permission) => ({ key: permission, label: permissionLabels[permission] })),
  }));
}

export async function getPlatformAdministrationData(role: AdminRole): Promise<PlatformAdministrationData> {
  const supabase = serviceDb();
  const [
    usersTotal,
    usersActive,
    usersRestricted,
    recentUsers,
    listingsActive,
    listingsReview,
    recentListings,
    transactionsTotal,
    transactionsHeld,
    recentTransactions,
    escrowPayments,
    payoutsPending,
    fraudSignals,
    riskFlags,
    aiTasks,
    reportsOpen,
    recentReports,
    audit,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("users").select("id", { count: "exact", head: true }).in("status", ["suspended", "banned"]),
    supabase.from("users").select("id,email,role,status,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).in("status", ["draft", "removed", "archived"]),
    supabase.from("listings").select("id,title,status,price_amount,currency,created_at").order("updated_at", { ascending: false }).limit(4),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }).in("status", ["paid", "escrowed", "disputed"]),
    supabase.from("transactions").select("id,status,total_amount,marketplace_fee_amount,currency,created_at").order("updated_at", { ascending: false }).limit(6),
    supabase.from("escrow_payments").select("amount,currency,status").in("status", ["held", "authorized", "released", "refunded"]).limit(200),
    supabase.from("payouts").select("id", { count: "exact", head: true }).in("status", ["pending", "failed"]),
    supabase.from("fraud_signals").select("id,risk_score,signal_type,source,created_at", { count: "exact" }).is("reviewed_at", null).order("risk_score", { ascending: false }).limit(4),
    supabase.from("automated_risk_flags").select("id", { count: "exact", head: true }).in("status", ["open", "auto_contained", "in_review"]),
    supabase.from("ai_tasks").select("id,task_type,status,error_message,created_at", { count: "exact" }).in("status", ["queued", "running", "failed"]).order("created_at", { ascending: false }).limit(4),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "triaged", "investigating"]),
    supabase.from("reports").select("id,reason,status,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("audit_logs").select("id,actor_type,action,table_name,record_id,metadata,created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const transactionRows = (recentTransactions.data ?? []) as Array<{ id: string; status: string; total_amount: number | string | null; marketplace_fee_amount: number | string | null; currency: string | null }>;
  const paymentRows = (escrowPayments.data ?? []) as Array<{ amount: number | string | null; currency: string | null; status: string }>;
  const currency = transactionRows[0]?.currency ?? paymentRows[0]?.currency ?? "USD";
  const gmv = sumAmounts(transactionRows, "total_amount");
  const fees = sumAmounts(transactionRows, "marketplace_fee_amount");
  const heldFunds = sumAmounts(paymentRows.filter((payment) => payment.status === "held" || payment.status === "authorized"), "amount");

  const areaMetrics: Record<PlatformAdminAreaKey, PlatformAreaSummary["metrics"]> = {
    users: [
      { label: "Total users", value: countValue(usersTotal), detail: "All buyer, seller, and admin accounts.", tone: "default" },
      { label: "Active", value: countValue(usersActive), detail: "Currently active accounts.", tone: "positive" },
      { label: "Restricted", value: countValue(usersRestricted), detail: "Suspended or banned accounts.", tone: "risk" },
    ],
    listings: [
      { label: "Active listings", value: countValue(listingsActive), detail: "Visible marketplace supply.", tone: "positive" },
      { label: "Needs review", value: countValue(listingsReview), detail: "Draft, removed, or archived supply requiring review.", tone: "warning" },
      { label: "Recent updates", value: String((recentListings.data ?? []).length), detail: "Newest listing records in moderation scope.", tone: "default" },
    ],
    transactions: [
      { label: "Transactions", value: countValue(transactionsTotal), detail: "All transaction records.", tone: "default" },
      { label: "Active holds", value: countValue(transactionsHeld), detail: "Paid, escrowed, or disputed transactions.", tone: "warning" },
      { label: "Recent GMV", value: money(gmv, currency), detail: "GMV in the sampled recent transaction window.", tone: "positive" },
    ],
    finance: [
      { label: "Sample GMV", value: money(gmv, currency), detail: "Recent transaction volume.", tone: "positive" },
      { label: "Sample fees", value: money(fees, currency), detail: "Marketplace fees from recent transactions.", tone: "positive" },
      { label: "Held funds", value: money(heldFunds, currency), detail: "Authorized or held escrow payments in sample.", tone: "warning" },
      { label: "Pending payouts", value: countValue(payoutsPending), detail: "Seller payouts pending or failed.", tone: "risk" },
    ],
    fraud: [
      { label: "Open fraud signals", value: countValue(fraudSignals), detail: "Unreviewed fraud signals.", tone: "risk" },
      { label: "Open risk flags", value: countValue(riskFlags), detail: "Automated risk flags awaiting disposition.", tone: "warning" },
      { label: "Top score", value: String(Math.round(Number((fraudSignals.data ?? [])[0]?.risk_score ?? 0))), detail: "Highest unreviewed signal score.", tone: "risk" },
    ],
    ai: [
      { label: "Active AI tasks", value: countValue(aiTasks), detail: "Queued, running, or failed AI tasks.", tone: "ai" },
      { label: "Failed tasks", value: String((aiTasks.data ?? []).filter((task: { status: string }) => task.status === "failed").length), detail: "Tasks requiring operator follow-up.", tone: "warning" },
      { label: "AI audit", value: "On", detail: "Agent runs route through admin-visible logs.", tone: "positive" },
    ],
    reports: [
      { label: "Open reports", value: countValue(reportsOpen), detail: "Reports in open, triaged, or investigating states.", tone: "warning" },
      { label: "Recent reports", value: String((recentReports.data ?? []).length), detail: "Newest report intake records.", tone: "default" },
      { label: "SLA owner", value: "Support", detail: "Report triage belongs to support and trust queues.", tone: "ai" },
    ],
  };

  const areaRows: Record<PlatformAdminAreaKey, PlatformAreaSummary["rows"]> = {
    users: (recentUsers.data ?? []).map((user: any) => ({ subject: user.email ?? user.id, status: user.status, detail: user.role, created: new Date(user.created_at).toLocaleDateString() })),
    listings: (recentListings.data ?? []).map((listing: any) => ({ subject: listing.title ?? listing.id, status: listing.status, detail: `${listing.currency ?? "USD"} ${listing.price_amount ?? 0}`, created: new Date(listing.created_at).toLocaleDateString() })),
    transactions: transactionRows.map((transaction) => ({ subject: transaction.id, status: transaction.status, detail: money(Number(transaction.total_amount ?? 0), transaction.currency ?? "USD"), created: "recent" })),
    finance: [
      { subject: "GMV", status: "sample", detail: money(gmv, currency), created: "recent" },
      { subject: "Marketplace fees", status: "sample", detail: money(fees, currency), created: "recent" },
      { subject: "Held funds", status: "escrow", detail: money(heldFunds, currency), created: "current" },
    ],
    fraud: (fraudSignals.data ?? []).map((signal: any) => ({ subject: signal.signal_type, status: String(Math.round(Number(signal.risk_score ?? 0))), detail: signal.source, created: new Date(signal.created_at).toLocaleDateString() })),
    ai: (aiTasks.data ?? []).map((task: any) => ({ subject: task.task_type, status: task.status, detail: task.error_message ?? "No error", created: new Date(task.created_at).toLocaleDateString() })),
    reports: (recentReports.data ?? []).map((report: any) => ({ subject: report.reason, status: report.status, detail: report.id, created: new Date(report.created_at).toLocaleDateString() })),
  };

  return {
    generatedAt: new Date().toISOString(),
    areas: platformAdminAreas.map((area) => ({
      ...area,
      metrics: areaMetrics[area.key],
      rows: areaRows[area.key],
      allowed: {
        read: can(role, area.readPermission),
        write: can(role, area.writePermission),
      },
    })),
    rbac: rbacMatrix(),
    audit: audit.data ?? [],
  };
}

export async function runPlatformAdminAction(input: {
  adminId: string;
  role: AdminRole;
  area: PlatformAdminAreaKey;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const area = platformAdminAreas.find((candidate) => candidate.key === input.area);
  if (!area) throw new Error("Unknown platform administration area.");
  if (!can(input.role, area.writePermission) && !can(input.role, "platform.operations")) {
    throw new Error(`Missing permission: ${area.writePermission}`);
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error("A reason of at least 5 characters is required for admin actions.");
  }

  const supabase = serviceDb();
  const metadata: Record<string, unknown> = { area: input.area, role: input.role, ...(input.metadata ?? {}) };

  if (input.area === "users" && input.targetId && input.action === "user.status_change") {
    const status = typeof metadata.status === "string" ? metadata.status : "suspended";
    return supabase.rpc("admin_set_user_status", {
      p_admin_id: input.adminId,
      p_user_id: input.targetId,
      p_status: status,
      p_reason: input.reason,
      p_restriction_type: metadata.restriction_type ?? null,
      p_expires_at: metadata.expires_at ?? null,
    });
  }

  if (input.area === "listings" && input.targetId && input.action === "listing.moderation_decision") {
    return supabase.rpc("admin_record_listing_decision", {
      p_admin_id: input.adminId,
      p_listing_id: input.targetId,
      p_decision: typeof metadata.decision === "string" ? metadata.decision : "hold",
      p_reason: input.reason,
      p_metadata: metadata,
    });
  }

  return recordAdminAction({
    adminId: input.adminId,
    actionType: input.action || area.auditAction,
    targetType: input.targetType ?? area.key,
    targetId: input.targetId ?? null,
    reason: input.reason,
    metadata,
  });
}
