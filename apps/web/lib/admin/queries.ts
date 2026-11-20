import { isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminOverviewData = {
  metrics: Record<string, number>;
  recentAuditLogs: Array<Record<string, unknown>>;
};

function getServiceClient() {
  return createAdminClient() as any;
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const supabase = getServiceClient();
  const [users, listings, reports, disputes, fraud, transactions, payments, aiTasks, audit] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "triaged", "investigating"]),
    supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["opened", "awaiting_buyer", "awaiting_seller", "under_review"]),
    supabase.from("fraud_signals").select("id", { count: "exact", head: true }).is("reviewed_at", null),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("escrow_payments").select("id", { count: "exact", head: true }),
    supabase.from("ai_tasks").select("id", { count: "exact", head: true }).in("status", ["queued", "running", "failed"]),
    supabase.from("audit_logs").select("id,actor_type,action,table_name,record_id,metadata,created_at").order("created_at", { ascending: false }).limit(8)
  ]);

  return {
    metrics: {
      users: users.count ?? 0,
      listings: listings.count ?? 0,
      openReports: reports.count ?? 0,
      openDisputes: disputes.count ?? 0,
      unreviewedFraudSignals: fraud.count ?? 0,
      transactions: transactions.count ?? 0,
      payments: payments.count ?? 0,
      activeAiTasks: aiTasks.count ?? 0
    },
    recentAuditLogs: audit.data ?? []
  };
}

export function boundedAdminLimit(limit: number) {
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.floor(limit), 1), 200);
}

export async function getAdminDirectoryRows(kind: string, limit = 50, cursor?: string) {
  const bounded = boundedAdminLimit(limit);
  if (!isLiveDatabaseConfigured()) return { data: [], error: null };
  const supabase = getServiceClient();
  const page = (query: any, column: string) => {
    const ordered = query.order(column, { ascending: false });
    return (cursor ? ordered.lt(column, cursor) : ordered).limit(bounded);
  };

  switch (kind) {
    case "users":
      return page(supabase.from("users").select("id,email,phone,role,status,banned_reason,metadata,created_at,updated_at,trust_scores(score,seller_score,buyer_score,fraud_risk_level)"), "updated_at");
    case "listings":
      return page(supabase.from("listings").select("id,title,status,price_amount,currency,seller_id,metadata,created_at,updated_at,listing_images(id,status,moderation_result)"), "updated_at");
    case "reports":
      return page(supabase.from("reports").select("id,reason,description,status,reporter_id,reported_user_id,listing_id,message_id,assigned_admin_id,resolution,metadata,created_at,updated_at,resolved_at"), "created_at");
    case "disputes":
      return page(supabase.from("disputes").select("id,transaction_id,opened_by_id,assigned_admin_id,reason,description,status,resolution,evidence,opened_at,due_at,resolved_at,created_at,updated_at,transactions(buyer_id,seller_id,total_amount,currency)"), "created_at");
    case "fraud-alerts":
      return page(supabase.from("fraud_signals").select("id,user_id,listing_id,transaction_id,signal_type,risk_score,source,payload,reviewed_by,reviewed_at,created_at,users(email,status),listings(title,status,price_amount,currency)"), "created_at");
    case "transactions":
      return page(supabase.from("transactions").select("id,listing_id,offer_id,buyer_id,seller_id,status,item_amount,shipping_amount,tax_amount,marketplace_fee_amount,total_amount,currency,paid_at,shipped_at,delivered_at,completed_at,cancelled_at,metadata,created_at,updated_at,escrow_payments(status,amount,provider,provider_payment_id),payouts(status,amount,provider_payout_id)"), "updated_at");
    case "payments":
      return page(supabase.from("escrow_payments").select("id,transaction_id,provider,provider_payment_id,status,amount,currency,authorized_at,captured_at,held_at,released_at,refunded_at,failure_code,metadata,created_at,updated_at"), "updated_at");
    case "ai-tasks":
      return page(supabase.from("ai_tasks").select("id,agent_id,requested_by,task_type,status,input,output,error_message,scheduled_at,started_at,completed_at,created_at,updated_at,ai_agents(name,agent_type,status)"), "created_at");
    case "search-analytics":
      return page(supabase.from("search_events").select("id,user_id,session_id,query,filters,result_count,clicked_listing_id,created_at"), "created_at");
    case "revenue":
      return page(supabase.from("transactions").select("id,status,item_amount,shipping_amount,tax_amount,marketplace_fee_amount,total_amount,currency,created_at,completed_at,cancelled_at"), "created_at");
    case "trust-overrides":
      return page(supabase.from("trust_score_overrides").select("id,user_id,created_by,approved_by,status,adjustment,reason,expires_at,created_at,updated_at"), "created_at");
    case "audit-logs":
      return page(supabase.from("audit_logs").select("id,actor_id,actor_type,action,table_name,record_id,ip_hash,user_agent,old_values,new_values,metadata,created_at"), "created_at");
    default:
      return { data: [], error: null };
  }
}

export async function getAdminAggregateMetrics(kind: string) {
  if (!isLiveDatabaseConfigured()) return null;
  const supabase = getServiceClient();
  const count = (table: string, statuses?: string[]) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (statuses) query = query.in("status", statuses);
    return query;
  };
  if (kind === "users") {
    const [total, active, restricted] = await Promise.all([count("users"), count("users", ["active"]), count("users", ["suspended", "banned"])]);
    if (total.error) return { error: total.error.message as string };
    return { metrics: [
      { label: "Accounts", value: String(total.count ?? 0), detail: "All accounts, not only the rows on this page." },
      { label: "Active", value: String(active.count ?? 0), detail: "Accounts with active status." },
      { label: "Restricted", value: String(restricted.count ?? 0), detail: "Suspended or banned accounts." }
    ] };
  }
  if (kind === "disputes") {
    const [total, open] = await Promise.all([count("disputes"), count("disputes", ["opened", "under_review", "awaiting_buyer", "awaiting_seller"])]);
    if (total.error) return { error: total.error.message as string };
    return { metrics: [
      { label: "Disputes", value: String(total.count ?? 0), detail: "All dispute rows." },
      { label: "Open", value: String(open.count ?? 0), detail: "Disputes that are not closed." }
    ] };
  }
  return null;
}

export async function recordAdminAction({ adminId, actionType, targetType, targetId, reason, beforeState, afterState, metadata }: {
  adminId: string;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getServiceClient();
  return supabase.rpc("record_admin_action", {
    p_admin_id: adminId,
    p_action_type: actionType,
    p_target_type: targetType,
    p_target_id: targetId ?? null,
    p_reason: reason ?? null,
    p_before_state: beforeState ?? null,
    p_after_state: afterState ?? null,
    p_metadata: metadata ?? {}
  });
}
