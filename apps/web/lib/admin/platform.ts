import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  Bot,
  FileSearch,
  Gavel,
  LineChart,
  ListChecks,
  ReceiptText,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminPermission } from "@/lib/admin/permissions";

export type AdminMetric = { label: string; value: string; detail: string; trend?: string };
export type AdminTableColumn = { label: string; key: string };
export type AdminTableRow = Record<string, string> & { severity?: "critical" | "high" | "medium" | "low" | "positive" };
export type AdminWorkflowStep = { title: string; description: string; owner: string; automation: string };
export type AdminPageConfig = {
  slug: string;
  title: string;
  description: string;
  permission: AdminPermission;
  icon: LucideIcon;
  primaryAction: string;
  metrics: AdminMetric[];
  columns: AdminTableColumn[];
  rows: AdminTableRow[];
  workflows: AdminWorkflowStep[];
  queries: string[];
  actions: string[];
};

const sharedWorkflow: AdminWorkflowStep[] = [
  { title: "Triage", description: "Review severity, SLA risk, customer impact, and linked records before assignment.", owner: "Queue router", automation: "Priority scoring, duplicate grouping, and policy tags" },
  { title: "Investigate", description: "Review evidence, account history, notes, AI explanations, and transaction context.", owner: "Assigned specialist", automation: "Evidence summary and relationship mapping" },
  { title: "Decide", description: "Apply the policy outcome, capture reason codes, notify impacted parties, and schedule follow-up.", owner: "Role-approved admin", automation: "Decision templates and audit-log writer" }
];

export const adminPageConfigs: AdminPageConfig[] = [
  {
    slug: "users",
    title: "User management",
    description: "Search, verify, suspend, reinstate, and support buyers, sellers, admins, and risky accounts.",
    permission: "users.read",
    icon: Users,
    primaryAction: "Open user profile",
    metrics: [
      { label: "Active users", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Suspended", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Ban appeals", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "User", key: "subject" }, { label: "Role", key: "role" }, { label: "Status", key: "status" }, { label: "Trust", key: "trust" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: [
      { title: "Identify account", description: "Combine profile, login, report, payment, listing, and device signals into one support view.", owner: "Support", automation: "Identity and duplicate-account matching" },
      { title: "Apply restriction", description: "Use a permissioned status action: warn, suspend buying, suspend selling, ban, or reinstate.", owner: "Risk admin", automation: "Reason-code templates and notification drafts" },
      { title: "Appeal follow-up", description: "Attach evidence, track SLA, and log every status change for accountability.", owner: "Trust lead", automation: "Appeal queue and audit event" }
    ],
    queries: ["admin_user_directory", "admin_user_risk_summary", "admin_user_action_history"],
    actions: ["Warn", "Suspend", "Ban", "Reinstate", "Override trust score"]
  },
  {
    slug: "listings",
    title: "Listing moderation",
    description: "Moderate new, edited, reported, and AI-flagged listings with media review, policy context, and bulk decisions.",
    permission: "listings.moderate",
    icon: ListChecks,
    primaryAction: "Moderate selected",
    metrics: [
      { label: "Pending review", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "AI flagged", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Appeals", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Listing", key: "subject" }, { label: "Seller", key: "seller" }, { label: "Risk", key: "risk" }, { label: "Status", key: "status" }, { label: "Decision", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_listing_moderation_queue", "admin_listing_media_signals", "admin_policy_decisions"],
    actions: ["Approve", "Reject", "Request changes", "Hold listing", "Bulk assign"]
  },
  {
    slug: "fraud-alerts",
    title: "Fraud signals",
    description: "Investigate fraud signals across accounts, listings, payments, messages, devices, and graph clusters.",
    permission: "fraud.review",
    icon: ShieldAlert,
    primaryAction: "Triage alert",
    metrics: [
      { label: "Open alerts", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Contained", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "False positive", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Alert", key: "subject" }, { label: "Entity", key: "entity" }, { label: "Score", key: "score" }, { label: "Source", key: "source" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_fraud_alert_queue", "admin_entity_graph_edges", "admin_alert_dispositions"],
    actions: ["Confirm fraud", "Suppress false positive", "Freeze", "Create rule", "Escalate cluster"]
  },
  {
    slug: "reports",
    title: "Reports",
    description: "Resolve user, listing, message, transaction, and safety reports with duplicate merging and evidence bundles.",
    permission: "reports.review",
    icon: FileSearch,
    primaryAction: "Resolve report",
    metrics: [
      { label: "Open reports", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Median first touch", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Action rate", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Report", key: "subject" }, { label: "Reporter", key: "reporter" }, { label: "Reason", key: "reason" }, { label: "SLA", key: "sla" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_report_queue", "admin_report_evidence", "admin_duplicate_reports"],
    actions: ["Assign", "Merge", "Investigate", "Resolve", "Escalate"]
  },
  {
    slug: "disputes",
    title: "Dispute handling",
    description: "Manage disputes, evidence requests, party communications, settlement decisions, refunds, and releases.",
    permission: "disputes.decide",
    icon: Gavel,
    primaryAction: "Draft decision",
    metrics: [
      { label: "Open disputes", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Value at risk", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "SLA risk", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Case", key: "subject" }, { label: "Buyer", key: "buyer" }, { label: "Seller", key: "seller" }, { label: "Amount", key: "amount" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_dispute_queue", "admin_dispute_evidence", "admin_dispute_settlement_ledger"],
    actions: ["Request evidence", "Message parties", "Refund", "Release", "Close"]
  },
  {
    slug: "transactions",
    title: "Transaction monitoring",
    description: "Monitor transaction status, held funds, fulfillment events, ledger entries, refunds, and reconciliation issues.",
    permission: "transactions.monitor",
    icon: ReceiptText,
    primaryAction: "Export ledger",
    metrics: [
      { label: "GMV today", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Held funds", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Mismatches", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Transaction", key: "subject" }, { label: "Buyer", key: "buyer" }, { label: "Seller", key: "seller" }, { label: "Status", key: "status" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_transaction_monitor", "admin_transaction_ledger", "admin_reconciliation_exceptions"],
    actions: ["Hold", "Release", "Refund", "Open dispute", "Add note"]
  },
  {
    slug: "payments",
    title: "Payment monitoring",
    description: "Monitor payout setup, authorizations, captures, held funds, refunds, chargebacks, payouts, and webhook health.",
    permission: "payments.monitor",
    icon: BadgeDollarSign,
    primaryAction: "Review payout",
    metrics: [
      { label: "Authorized", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Payout failures", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Webhook lag", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Payment", key: "subject" }, { label: "Provider", key: "provider" }, { label: "Status", key: "status" }, { label: "Amount", key: "amount" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_payment_monitor", "admin_payout_monitor", "admin_webhook_health"],
    actions: ["Capture", "Refund", "Hold payout", "Release payout", "Sync Stripe"]
  },
  {
    slug: "ai-tasks",
    title: "AI usage logs",
    description: "Monitor AI-assisted tasks, listing generation, moderation checks, errors, latency, usage, and cost attribution.",
    permission: "ai.monitor",
    icon: Bot,
    primaryAction: "Retry task",
    metrics: [
      { label: "AI calls", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Failures", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Estimated cost", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Usage event", key: "subject" }, { label: "Tool", key: "agent" }, { label: "Status", key: "status" }, { label: "Latency", key: "latency" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_ai_task_monitor", "admin_agent_health", "admin_ai_cost_summary"],
    actions: ["Retry", "Cancel", "Pause tool", "Inspect input", "Create incident"]
  },
  {
    slug: "search-analytics",
    title: "Search analytics",
    description: "Track demand, zero-result searches, click-through, saved search alerts, ranking quality, and conversion from discovery.",
    permission: "analytics.search",
    icon: Search,
    primaryAction: "Export search terms",
    metrics: [
      { label: "Searches", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Zero result", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "CTR", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Query", key: "subject" }, { label: "Searches", key: "searches" }, { label: "Results", key: "results" }, { label: "CTR", key: "ctr" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_search_terms", "admin_zero_result_searches", "admin_search_conversion"],
    actions: ["Export", "Create supply alert", "Annotate ranking", "Open segment"]
  },
  {
    slug: "revenue",
    title: "Revenue analytics",
    description: "Measure GMV, marketplace fees, take rate, refunds, chargebacks, payouts, category revenue, and cohort performance.",
    permission: "analytics.revenue",
    icon: LineChart,
    primaryAction: "Schedule report",
    metrics: [
      { label: "GMV", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Net revenue", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Take rate", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Segment", key: "subject" }, { label: "GMV", key: "gmv" }, { label: "Fees", key: "fees" }, { label: "Refunds", key: "refunds" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_revenue_metrics", "admin_category_revenue", "admin_refund_chargeback_summary"],
    actions: ["Compare period", "Export CSV", "Schedule", "Annotate"]
  },
  {
    slug: "trust-overrides",
    title: "Trust score overrides",
    description: "Apply temporary or permanent trust score adjustments with reason codes, approval gates, expiration, and audit trails.",
    permission: "trust.override",
    icon: SlidersHorizontal,
    primaryAction: "Create override",
    metrics: [
      { label: "Active overrides", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Pending approval", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Avg adjustment", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "User", key: "subject" }, { label: "Adjustment", key: "adjustment" }, { label: "Reason", key: "reason" }, { label: "Expires", key: "expires" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: sharedWorkflow,
    queries: ["admin_trust_override_queue", "admin_trust_score_history", "admin_trust_override_audit"],
    actions: ["Create", "Approve", "Expire", "Recalculate", "Audit"]
  },
  {
    slug: "audit-logs",
    title: "Audit logs",
    description: "Immutable operational history for admin actions, automated changes, AI decisions, payment events, and security investigations.",
    permission: "audit.read",
    icon: Activity,
    primaryAction: "Export logs",
    metrics: [
      { label: "Events today", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Sensitive actions", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Retention", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Event", key: "subject" }, { label: "Actor", key: "actor" }, { label: "Target", key: "target" }, { label: "When", key: "when" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: [
      { title: "Capture", description: "Every admin mutation, AI moderation decision, and payment event writes before/after state.", owner: "Platform", automation: "Database functions and API middleware" },
      { title: "Review", description: "Filter by actor, permission, target, severity, IP hash, user agent, and time range.", owner: "Security", automation: "Sensitive-action saved searches" },
      { title: "Export", description: "Generate tamper-evident exports for compliance, legal, finance, and incident response.", owner: "Compliance", automation: "Retention and export jobs" }
    ],
    queries: ["admin_audit_log_search", "admin_sensitive_action_feed", "admin_actor_activity"],
    actions: ["Filter", "Export", "Open target", "Create incident"]
  },
  {
    slug: "settings",
    title: "Admin settings",
    description: "Configure policies, queue routing, confirmation requirements, role rules, escalation rules, and console defaults.",
    permission: "workflows.manage",
    icon: Settings,
    primaryAction: "Update policy",
    metrics: [
      { label: "Active policies", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Approval gates", value: "0", detail: "Loaded from the database for this admin role." },
      { label: "Queue automations", value: "0", detail: "Loaded from the database for this admin role." }
    ],
    columns: [{ label: "Setting", key: "subject" }, { label: "Area", key: "area" }, { label: "Status", key: "status" }, { label: "Owner", key: "owner" }, { label: "Action", key: "action" }],
    rows: [],
    workflows: [
      { title: "Propose policy", description: "Draft policy changes with owner, expected impact, rollout window, and rollback plan.", owner: "Ops lead", automation: "Policy diff and impact checklist" },
      { title: "Approve rollout", description: "Require role-gated approval for sensitive queues, fraud thresholds, payment gates, and admin permissions.", owner: "Super admin", automation: "Approval gate and audit event" },
      { title: "Monitor effect", description: "Track false positives, SLA impact, queue volume, and customer outcomes after changes ship.", owner: "Analytics", automation: "Post-change dashboard annotation" }
    ],
    queries: ["admin_console_settings", "admin_policy_change_log", "admin_workflow_automation_health"],
    actions: ["Update", "Require approval", "Disable", "Test routing", "Audit change"]
  }
];

export const overviewCards = [
  { title: "Risk queue", value: "0", detail: "Loaded from the database for this admin role.", icon: ShieldCheck },
  { title: "Users needing action", value: "0", detail: "Loaded from the database for this admin role.", icon: Ban },
  { title: "Payments monitored", value: "0", detail: "Loaded from the database for this admin role.", icon: Scale },
  { title: "Analytics health", value: "0", detail: "Loaded from the database for this admin role.", icon: AlertTriangle }
];

const primaryAdminSlugs = [
  "users",
  "listings",
  "reports",
  "disputes",
  "transactions",
  "fraud-alerts",
  "ai-tasks",
  "search-analytics",
  "revenue",
  "audit-logs",
  "settings"
] as const;

export const primaryAdminPageConfigs = adminPageConfigs.filter((page) => primaryAdminSlugs.includes(page.slug as (typeof primaryAdminSlugs)[number]));

export function getAdminPageConfig(slug: string) {
  return adminPageConfigs.find((page) => page.slug === slug);
}
