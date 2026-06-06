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
  { title: "Triage", description: "Score severity, SLA risk, customer impact, and linked entities before assignment.", owner: "Queue router", automation: "Priority model, duplicate clustering, and policy tags" },
  { title: "Investigate", description: "Review evidence, entity history, notes, AI explanations, and transaction context.", owner: "Assigned specialist", automation: "Evidence bundle builder and graph enrichment" },
  { title: "Decide", description: "Apply policy outcome, capture reason codes, notify impacted parties, and schedule follow-up.", owner: "Role-approved admin", automation: "Decision templates and audit-log writer" }
];

export const adminPageConfigs: AdminPageConfig[] = [
  {
    slug: "users",
    title: "User management",
    description: "Search, verify, segment, suspend, ban, reinstate, and support every buyer, seller, admin, and risky account.",
    permission: "users.read",
    icon: Users,
    primaryAction: "Open user profile",
    metrics: [
      { label: "Active users", value: "24.8k", detail: "96% verified email or phone", trend: "+8.2%" },
      { label: "Suspended", value: "143", detail: "42 temporary commerce holds", trend: "-3.1%" },
      { label: "Ban appeals", value: "18", detail: "5 critical SLA cases", trend: "+4" }
    ],
    columns: [{ label: "User", key: "subject" }, { label: "Role", key: "role" }, { label: "Status", key: "status" }, { label: "Trust", key: "trust" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Maya Chen", role: "seller", status: "active", trust: "91", action: "Verify payout", severity: "positive" },
      { subject: "devon@example.com", role: "buyer", status: "suspended", trust: "38", action: "Review appeal", severity: "high" },
      { subject: "Northstar Camera", role: "seller", status: "active", trust: "67", action: "Request ID", severity: "medium" }
    ],
    workflows: [
      { title: "Identify account", description: "Combine profile, login, report, payment, listing, and device signals into a single support view.", owner: "Support", automation: "Identity and duplicate-account matching" },
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
      { label: "Pending review", value: "86", detail: "21 high-value items", trend: "+12" },
      { label: "AI flagged", value: "34", detail: "Duplicate images and risky pricing", trend: "41%" },
      { label: "Appeals", value: "7", detail: "Rejected listing appeals", trend: "2 due" }
    ],
    columns: [{ label: "Listing", key: "subject" }, { label: "Seller", key: "seller" }, { label: "Risk", key: "risk" }, { label: "Status", key: "status" }, { label: "Decision", key: "action" }],
    rows: [
      { subject: "Rolex Submariner", seller: "Vault Finds", risk: "98 duplicate image", status: "held", action: "Request proof", severity: "critical" },
      { subject: "Canon R5 kit", seller: "Local Photo", risk: "76 price anomaly", status: "needs_review", action: "Escalate", severity: "high" },
      { subject: "Vintage desk", seller: "Ari Home", risk: "18 clean", status: "pending", action: "Approve", severity: "low" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_listing_moderation_queue", "admin_listing_media_signals", "admin_policy_decisions"],
    actions: ["Approve", "Reject", "Request changes", "Hold listing", "Bulk assign"]
  },
  {
    slug: "fraud-alerts",
    title: "Fraud alerts",
    description: "Investigate fraud signals across accounts, listings, payments, messages, devices, and graph clusters.",
    permission: "fraud.review",
    icon: ShieldAlert,
    primaryAction: "Triage alert",
    metrics: [
      { label: "Open alerts", value: "42", detail: "9 critical clusters", trend: "+6" },
      { label: "Contained", value: "17", detail: "Auto-held this week", trend: "+22%" },
      { label: "False positive", value: "8.4%", detail: "30-day analyst disposition", trend: "-1.1%" }
    ],
    columns: [{ label: "Alert", key: "subject" }, { label: "Entity", key: "entity" }, { label: "Score", key: "score" }, { label: "Source", key: "source" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Synthetic seller cluster", entity: "4 users", score: "99", source: "graph", action: "Freeze accounts", severity: "critical" },
      { subject: "Off-platform payment script", entity: "Conversation", score: "91", source: "AI moderation", action: "Block message", severity: "critical" },
      { subject: "Chargeback velocity", entity: "Transaction", score: "78", source: "Stripe", action: "Hold payout", severity: "high" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_fraud_alert_queue", "admin_entity_graph_edges", "admin_alert_dispositions"],
    actions: ["Confirm fraud", "Suppress false positive", "Freeze", "Create rule", "Escalate cluster"]
  },
  {
    slug: "reports",
    title: "Report review",
    description: "Resolve user, listing, message, transaction, and safety reports with duplicate merging and evidence bundles.",
    permission: "reports.review",
    icon: FileSearch,
    primaryAction: "Resolve report",
    metrics: [
      { label: "Open reports", value: "118", detail: "32 unassigned", trend: "+15" },
      { label: "Median first touch", value: "28m", detail: "SLA target 1h", trend: "-9m" },
      { label: "Action rate", value: "37%", detail: "Last 7 days", trend: "+3%" }
    ],
    columns: [{ label: "Report", key: "subject" }, { label: "Reporter", key: "reporter" }, { label: "Reason", key: "reason" }, { label: "SLA", key: "sla" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Counterfeit claim", reporter: "Buyer", reason: "Authenticity", sla: "45m", action: "Review listing", severity: "high" },
      { subject: "Harassment message", reporter: "Seller", reason: "Safety", sla: "1h", action: "Block user", severity: "critical" },
      { subject: "Duplicate report", reporter: "Buyer", reason: "Spam", sla: "Tomorrow", action: "Merge", severity: "medium" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_report_queue", "admin_report_evidence", "admin_duplicate_reports"],
    actions: ["Assign", "Merge", "Investigate", "Resolve", "Escalate"]
  },
  {
    slug: "disputes",
    title: "Dispute handling",
    description: "Manage escrow disputes, evidence requests, party communications, settlement decisions, refunds, and releases.",
    permission: "disputes.decide",
    icon: Gavel,
    primaryAction: "Draft decision",
    metrics: [
      { label: "Open disputes", value: "29", detail: "11 awaiting evidence", trend: "+4" },
      { label: "Value at risk", value: "$18.4k", detail: "Escrow currently held", trend: "+$2.1k" },
      { label: "SLA risk", value: "6", detail: "Due in 24 hours", trend: "Urgent" }
    ],
    columns: [{ label: "Case", key: "subject" }, { label: "Buyer", key: "buyer" }, { label: "Seller", key: "seller" }, { label: "Amount", key: "amount" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Item not as described", buyer: "Mika", seller: "Urban Gear", amount: "$640", action: "Request seller evidence", severity: "high" },
      { subject: "No delivery", buyer: "Chris", seller: "Part Depot", amount: "$120", action: "Refund buyer", severity: "medium" },
      { subject: "Authenticity dispute", buyer: "Lina", seller: "Vault Finds", amount: "$4,200", action: "Escalate legal", severity: "critical" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_dispute_queue", "admin_dispute_evidence", "admin_dispute_settlement_ledger"],
    actions: ["Request evidence", "Message parties", "Refund", "Release", "Close"]
  },
  {
    slug: "transactions",
    title: "Transaction monitoring",
    description: "Observe transaction lifecycles, escrow state, fulfillment events, ledger entries, refunds, and reconciliation exceptions.",
    permission: "transactions.monitor",
    icon: ReceiptText,
    primaryAction: "Export ledger",
    metrics: [
      { label: "GMV today", value: "$42.7k", detail: "812 orders", trend: "+11%" },
      { label: "Escrowed", value: "$96.2k", detail: "434 active holds", trend: "+7%" },
      { label: "Mismatches", value: "5", detail: "Need finance review", trend: "2 new" }
    ],
    columns: [{ label: "Transaction", key: "subject" }, { label: "Buyer", key: "buyer" }, { label: "Seller", key: "seller" }, { label: "Status", key: "status" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "TX-9F21", buyer: "Maya", seller: "Ari Home", status: "escrowed", action: "Release eligible", severity: "positive" },
      { subject: "TX-8A11", buyer: "Devon", seller: "Vault Finds", status: "disputed", action: "Open case", severity: "high" },
      { subject: "TX-7C04", buyer: "Sam", seller: "Parts Depot", status: "paid", action: "Capture", severity: "medium" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_transaction_monitor", "admin_transaction_ledger", "admin_reconciliation_exceptions"],
    actions: ["Hold", "Release", "Refund", "Open dispute", "Add note"]
  },
  {
    slug: "payments",
    title: "Payment monitoring",
    description: "Monitor Stripe Connect onboarding, authorizations, captures, escrow holds, refunds, chargebacks, payouts, and webhook health.",
    permission: "payments.monitor",
    icon: BadgeDollarSign,
    primaryAction: "Review payout",
    metrics: [
      { label: "Authorized", value: "$33.1k", detail: "Capture windows watched", trend: "+5%" },
      { label: "Payout failures", value: "4", detail: "Restricted accounts", trend: "Needs action" },
      { label: "Webhook lag", value: "12s", detail: "p95 delivery delay", trend: "Healthy" }
    ],
    columns: [{ label: "Payment", key: "subject" }, { label: "Provider", key: "provider" }, { label: "Status", key: "status" }, { label: "Amount", key: "amount" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "pi_3Qr...", provider: "Stripe", status: "held", amount: "$840", action: "Release when delivered", severity: "medium" },
      { subject: "po_1Ab...", provider: "Stripe", status: "failed", amount: "$212", action: "Fix seller account", severity: "high" },
      { subject: "dp_4Zx...", provider: "Stripe", status: "chargeback", amount: "$1,220", action: "Submit evidence", severity: "critical" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_payment_monitor", "admin_payout_monitor", "admin_webhook_health"],
    actions: ["Capture", "Refund", "Hold payout", "Release payout", "Sync Stripe"]
  },
  {
    slug: "ai-tasks",
    title: "AI task monitoring",
    description: "Monitor buyer agents, seller agents, pricing assistants, search agents, listing generation, and moderation automations.",
    permission: "ai.monitor",
    icon: Bot,
    primaryAction: "Retry task",
    metrics: [
      { label: "Running", value: "23", detail: "7 moderation tasks", trend: "Normal" },
      { label: "Failures", value: "11", detail: "Mostly image parsing", trend: "-18%" },
      { label: "Avg latency", value: "4.8s", detail: "p50 end-to-end", trend: "+0.2s" }
    ],
    columns: [{ label: "Task", key: "subject" }, { label: "Agent", key: "agent" }, { label: "Status", key: "status" }, { label: "Latency", key: "latency" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "listing-copy", agent: "Seller Copilot", status: "succeeded", latency: "3.2s", action: "Inspect", severity: "positive" },
      { subject: "image-moderation", agent: "Safety Worker", status: "failed", latency: "timeout", action: "Retry", severity: "high" },
      { subject: "search-intent", agent: "Discovery AI", status: "running", latency: "8.1s", action: "Trace", severity: "medium" }
    ],
    workflows: sharedWorkflow,
    queries: ["admin_ai_task_monitor", "admin_agent_health", "admin_ai_cost_summary"],
    actions: ["Retry", "Cancel", "Pause agent", "Inspect IO", "Create incident"]
  },
  {
    slug: "search-analytics",
    title: "Search analytics",
    description: "Track demand, zero-result searches, click-through, saved search alerts, ranking quality, and conversion from discovery.",
    permission: "analytics.search",
    icon: Search,
    primaryAction: "Export search terms",
    metrics: [
      { label: "Searches", value: "58.2k", detail: "Last 7 days", trend: "+14%" },
      { label: "Zero result", value: "7.8%", detail: "Needs category supply", trend: "-0.6%" },
      { label: "CTR", value: "31.4%", detail: "Result to listing view", trend: "+2.3%" }
    ],
    columns: [{ label: "Query", key: "subject" }, { label: "Searches", key: "searches" }, { label: "Results", key: "results" }, { label: "CTR", key: "ctr" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "standing desk", searches: "1,240", results: "84 avg", ctr: "39%", action: "Boost supply", severity: "positive" },
      { subject: "electric scooter", searches: "940", results: "0 avg", ctr: "0%", action: "Create demand alert", severity: "high" },
      { subject: "sony a7iv", searches: "722", results: "12 avg", ctr: "44%", action: "Watch fraud", severity: "medium" }
    ],
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
      { label: "GMV", value: "$1.28M", detail: "30-day rolling", trend: "+18%" },
      { label: "Net revenue", value: "$96.4k", detail: "Fees minus refunds", trend: "+12%" },
      { label: "Take rate", value: "7.5%", detail: "Blended marketplace fee", trend: "Stable" }
    ],
    columns: [{ label: "Segment", key: "subject" }, { label: "GMV", key: "gmv" }, { label: "Fees", key: "fees" }, { label: "Refunds", key: "refunds" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Electronics", gmv: "$412k", fees: "$31k", refunds: "$8.2k", action: "Open category", severity: "positive" },
      { subject: "Luxury", gmv: "$221k", fees: "$19k", refunds: "$14k", action: "Review trust", severity: "high" },
      { subject: "Home", gmv: "$188k", fees: "$11k", refunds: "$2.1k", action: "Grow supply", severity: "positive" }
    ],
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
      { label: "Active overrides", value: "31", detail: "12 expire this week", trend: "+3" },
      { label: "Pending approval", value: "6", detail: "Requires risk lead", trend: "2 urgent" },
      { label: "Avg adjustment", value: "+4.2", detail: "Weighted trust impact", trend: "Controlled" }
    ],
    columns: [{ label: "User", key: "subject" }, { label: "Adjustment", key: "adjustment" }, { label: "Reason", key: "reason" }, { label: "Expires", key: "expires" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "Vault Finds", adjustment: "-18", reason: "Counterfeit review", expires: "7 days", action: "Approve", severity: "high" },
      { subject: "Ari Home", adjustment: "+5", reason: "Manual verification", expires: "30 days", action: "Monitor", severity: "positive" },
      { subject: "devon@example.com", adjustment: "-40", reason: "Confirmed abuse", expires: "Permanent", action: "Ban user", severity: "critical" }
    ],
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
      { label: "Events today", value: "9.4k", detail: "Admin, system, and AI", trend: "+4%" },
      { label: "Sensitive actions", value: "64", detail: "Ban, refund, trust override", trend: "8 reviewed" },
      { label: "Retention", value: "365d", detail: "Policy enforced", trend: "Compliant" }
    ],
    columns: [{ label: "Event", key: "subject" }, { label: "Actor", key: "actor" }, { label: "Target", key: "target" }, { label: "When", key: "when" }, { label: "Action", key: "action" }],
    rows: [
      { subject: "user.suspend", actor: "risk@ffm", target: "devon@example.com", when: "4m ago", action: "Inspect", severity: "high" },
      { subject: "listing.approve", actor: "moderator@ffm", target: "Vintage desk", when: "12m ago", action: "Open listing", severity: "low" },
      { subject: "trust.override", actor: "lead@ffm", target: "Vault Finds", when: "22m ago", action: "Review", severity: "critical" }
    ],
    workflows: [
      { title: "Capture", description: "Every admin mutation, AI moderation decision, and payment event writes before/after state.", owner: "Platform", automation: "Database functions and API middleware" },
      { title: "Review", description: "Filter by actor, permission, target, severity, IP hash, user agent, and time range.", owner: "Security", automation: "Sensitive-action saved searches" },
      { title: "Export", description: "Generate tamper-evident exports for compliance, legal, finance, and incident response.", owner: "Compliance", automation: "Retention and export jobs" }
    ],
    queries: ["admin_audit_log_search", "admin_sensitive_action_feed", "admin_actor_activity"],
    actions: ["Filter", "Export", "Open target", "Create incident"]
  }
];

export const overviewCards = [
  { title: "Risk queue", value: "187", detail: "Listings, reports, disputes, and fraud alerts awaiting action", icon: ShieldCheck },
  { title: "Users needing action", value: "61", detail: "Suspensions, appeals, verification, and high-risk sellers", icon: Ban },
  { title: "Payments monitored", value: "$96.2k", detail: "Escrow, payout, chargeback, and refund exposure", icon: Scale },
  { title: "Analytics health", value: "99.8%", detail: "Search, revenue, audit, and AI event pipelines", icon: AlertTriangle }
];

export function getAdminPageConfig(slug: string) {
  return adminPageConfigs.find((page) => page.slug === slug);
}
