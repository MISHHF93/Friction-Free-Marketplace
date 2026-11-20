import { NextResponse } from "next/server";
import { z } from "zod";
import { canRestrictUser } from "@/lib/admin/permissions";
import { settleDispute } from "@/lib/payments/settlement";
import { getStripe } from "@/lib/stripe/server";
import { recordAdminAction } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncListingToSearch } from "@/lib/search/discovery";

const uuidSchema = z.string().uuid();

async function cancelRestrictedCheckoutIntents(supabase: any, userId: string) {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: transactions } = await supabase.from("transactions").select("id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).eq("status", "cancelled").gte("cancelled_at", cutoff);
  const ids = (transactions ?? []).map((transaction: { id: string }) => transaction.id);
  if (!ids.length) return;
  const { data: payments } = await supabase.from("escrow_payments").select("provider_payment_id,status").in("transaction_id", ids).in("status", ["requires_action", "authorized", "capturing"]);
  for (const payment of payments ?? []) {
    if (!payment.provider_payment_id) continue;
    try {
      await getStripe().paymentIntents.cancel(payment.provider_payment_id);
    } catch {
      // The checkout row is already cancelled. A Stripe miss is reported by reconcile.
    }
  }
}

async function restrictMarketplaceUser(supabase: any, userId: string) {
  try {
    await supabase.auth.admin.signOut(userId);
  } catch {
    // Session revoke is best-effort when auth admin is unavailable.
  }
  const paused = await supabase.from("listings").update({ status: "paused" }).eq("seller_id", userId).eq("status", "active").select("id");
  await Promise.all((paused.data ?? []).map((listing: { id: string }) => syncListingToSearch(listing.id).catch(() => null)));
}

export const adminMutationActions = {
  users: ["suspend", "ban", "reinstate"],
  listings: ["approve", "reject", "hold"],
  reports: ["investigate", "resolve"],
  disputes: ["review", "close"],
  "fraud-alerts": ["confirm", "dismiss"]
} as const;

export type AdminMutationEndpoint = keyof typeof adminMutationActions;

export function adminMutationsFor(endpoint: string) {
  return endpoint in adminMutationActions ? adminMutationActions[endpoint as AdminMutationEndpoint] : [];
}

export async function applyAdminMutation(input: {
  endpoint: string;
  adminId: string;
  body: unknown;
}) {
  const actions = adminMutationsFor(input.endpoint);
  if (!actions.length) {
    return {
      response: NextResponse.json({
        error: "This admin queue does not change marketplace records.",
        supported: false
      }, { status: 422 })
    };
  }

  const parsed = z.object({
    action: z.string(),
    target_id: uuidSchema,
    reason: z.string().trim().min(3).max(2000).optional(),
    outcome: z.enum(["refund_buyer", "release_seller", "split"]).optional()
  }).safeParse(input.body);
  if (!parsed.success || !actions.includes(parsed.data.action as never)) {
    return {
      response: NextResponse.json({
        error: "Unsupported admin action.",
        supported: true,
        actions
      }, { status: 400 })
    };
  }

  const supabase = createAdminClient() as any;
  const { action, target_id: targetId, reason, outcome } = parsed.data;
  let update;

  switch (input.endpoint) {
    case "users": {
      if (!reason) return { response: NextResponse.json({ error: "A reason is required to change an account." }, { status: 400 }) };
      const target = await supabase.from("users").select("id,role,metadata,status").eq("id", targetId).maybeSingle();
      const actor = await supabase.from("users").select("id,role,metadata,status").eq("id", input.adminId).maybeSingle();
      if (!target.data || !actor.data || !canRestrictUser(actor.data, target.data)) {
        return { response: NextResponse.json({ error: "You cannot change this account." }, { status: 403 }) };
      }
      const nextStatus = action === "reinstate" ? "active" : action === "ban" ? "banned" : "suspended";
      const changed = await supabase.rpc("admin_set_user_status", {
        p_admin_id: input.adminId,
        p_user_id: targetId,
        p_status: nextStatus,
        p_reason: reason
      });
      if (changed.error) return { response: NextResponse.json({ error: changed.error.message }, { status: 403 }) };
      if (action !== "reinstate") await cancelRestrictedCheckoutIntents(supabase, targetId);
      update = await supabase.from("users").select("id,status").eq("id", targetId).maybeSingle();
      if (action !== "reinstate") await restrictMarketplaceUser(supabase, targetId);
      const touched = await supabase.from("listings").select("id").eq("seller_id", targetId).in("status", ["paused", "active"]);
      await Promise.all((touched.data ?? []).map((listing: { id: string }) => syncListingToSearch(listing.id).catch(() => null)));
      break;
    }
    case "listings":
      update = await supabase.from("listings").update({
        status: action === "approve" ? "active" : action === "reject" ? "removed" : "paused"
      }).eq("id", targetId).select("id,status").maybeSingle();
      if (!update.error && update.data) await syncListingToSearch(targetId).catch(() => null);
      break;
    case "reports":
      update = await supabase.from("reports").update({
        status: action === "investigate" ? "investigating" : "closed",
        resolution: reason ?? null,
        resolved_at: action === "resolve" ? new Date().toISOString() : null,
        assigned_admin_id: input.adminId
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    case "disputes": {
      if (action === "close") {
        if (!reason || !outcome) return { response: NextResponse.json({ error: "Closing a dispute requires a reason and an outcome." }, { status: 400 }) };
        const settled = await settleDispute(supabase, { disputeId: targetId, outcome, actorId: input.adminId, reason });
        if ("error" in settled && settled.error) return { response: NextResponse.json({ error: settled.error }, { status: settled.statusCode ?? 409 }) };
        update = await supabase.from("disputes").select("id,status").eq("id", targetId).maybeSingle();
        break;
      }
      update = await supabase.from("disputes").update({
        status: "under_review",
        resolution: reason ?? null,
        assigned_admin_id: input.adminId
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    }
    case "fraud-alerts": {
      const signal = await supabase.from("fraud_signals").select("id,user_id,listing_id,payload").eq("id", targetId).maybeSingle();
      update = await supabase.from("fraud_signals").update({
        reviewed_by: input.adminId,
        reviewed_at: new Date().toISOString(),
        payload: { ...(signal.data?.payload ?? {}), resolution: action, reason: reason ?? null }
      }).eq("id", targetId).select("id,reviewed_at,payload").maybeSingle();
      if (!update.error && action === "confirm" && signal.data?.user_id) {
        if (!reason) return { response: NextResponse.json({ error: "A reason is required to suspend the account." }, { status: 400 }) };
        const target = await supabase.from("users").select("id,role,metadata,status").eq("id", signal.data.user_id).maybeSingle();
        const actor = await supabase.from("users").select("id,role,metadata,status").eq("id", input.adminId).maybeSingle();
        if (!target.data || !actor.data || !canRestrictUser(actor.data, target.data)) {
          return { response: NextResponse.json({ error: "You cannot change this account." }, { status: 403 }) };
        }
        const changed = await supabase.rpc("admin_set_user_status", {
          p_admin_id: input.adminId,
          p_user_id: signal.data.user_id,
          p_status: "suspended",
          p_reason: reason
        });
        if (changed.error) return { response: NextResponse.json({ error: changed.error.message }, { status: 403 }) };
        await restrictMarketplaceUser(supabase, signal.data.user_id);
      }
      break;
    }
    default:
      return { response: NextResponse.json({ error: "This admin queue does not change marketplace records.", supported: false }, { status: 422 }) };
  }

  if (update.error) return { response: NextResponse.json({ error: update.error.message }, { status: 500 }) };
  if (!update.data) return { response: NextResponse.json({ error: "Record not found." }, { status: 404 }) };

  const audit = await recordAdminAction({
    adminId: input.adminId,
    actionType: `${input.endpoint}.${action}`,
    targetType: input.endpoint,
    targetId,
    reason: reason ?? null,
    afterState: update.data,
    metadata: { endpoint: input.endpoint }
  });
  if (audit.error) return { response: NextResponse.json({ error: audit.error.message }, { status: 500 }) };

  return { action: audit.data, record: update.data };
}
