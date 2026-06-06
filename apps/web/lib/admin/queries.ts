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

export async function getAdminDirectoryRows(kind: string, limit = 50) {
  const supabase = getServiceClient();

  switch (kind) {
    case "users":
      return supabase.from("users").select("id,email,phone,role,status,banned_reason,metadata,created_at,updated_at,trust_scores(score,seller_score,buyer_score,fraud_risk_level)").order("updated_at", { ascending: false }).limit(limit);
    case "listings":
      return supabase.from("listings").select("id,title,status,price_amount,currency,seller_id,metadata,created_at,updated_at,listing_images(id,status,moderation_result)").order("updated_at", { ascending: false }).limit(limit);
    case "reports":
      return supabase.from("reports").select("id,reason,description,status,reporter_id,reported_user_id,listing_id,message_id,assigned_admin_id,resolution,metadata,created_at,updated_at,resolved_at").order("created_at", { ascending: false }).limit(limit);
    case "disputes":
      return supabase.from("disputes").select("id,transaction_id,opened_by_id,assigned_admin_id,reason,description,status,resolution,evidence,opened_at,due_at,resolved_at,created_at,updated_at").order("created_at", { ascending: false }).limit(limit);
    case "fraud-alerts":
      return supabase.from("fraud_signals").select("id,user_id,listing_id,transaction_id,signal_type,risk_score,source,payload,reviewed_by,reviewed_at,created_at").order("risk_score", { ascending: false }).limit(limit);
    case "transactions":
      return supabase.from("transactions").select("id,listing_id,offer_id,buyer_id,seller_id,status,item_amount,shipping_amount,tax_amount,marketplace_fee_amount,total_amount,currency,paid_at,shipped_at,delivered_at,completed_at,cancelled_at,metadata,created_at,updated_at,escrow_payments(status,amount,provider,provider_payment_id),payouts(status,amount,provider_payout_id)").order("updated_at", { ascending: false }).limit(limit);
    case "payments":
      return supabase.from("escrow_payments").select("id,transaction_id,provider,provider_payment_id,status,amount,currency,authorized_at,captured_at,held_at,released_at,refunded_at,failure_code,metadata,created_at,updated_at").order("updated_at", { ascending: false }).limit(limit);
    case "ai-tasks":
      return supabase.from("ai_tasks").select("id,agent_id,requested_by,task_type,status,input,output,error_message,scheduled_at,started_at,completed_at,created_at,updated_at,ai_agents(name,agent_type,status)").order("created_at", { ascending: false }).limit(limit);
    case "search-analytics":
      return supabase.from("search_events").select("id,user_id,session_id,query,filters,result_count,clicked_listing_id,created_at").order("created_at", { ascending: false }).limit(limit);
    case "revenue":
      return supabase.from("transactions").select("id,status,item_amount,shipping_amount,tax_amount,marketplace_fee_amount,total_amount,currency,created_at,completed_at,refunded_at:cancelled_at").order("created_at", { ascending: false }).limit(limit);
    case "trust-overrides":
      return supabase.from("trust_score_overrides").select("id,user_id,created_by,approved_by,status,adjustment,reason,expires_at,created_at,updated_at").order("created_at", { ascending: false }).limit(limit);
    case "audit-logs":
      return supabase.from("audit_logs").select("id,actor_id,actor_type,action,table_name,record_id,ip_hash,user_agent,old_values,new_values,metadata,created_at").order("created_at", { ascending: false }).limit(limit);
    default:
      return { data: [], error: null };
  }
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
