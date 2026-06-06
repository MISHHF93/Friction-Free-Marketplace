import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type AdminRole = "support" | "moderator" | "risk" | "finance" | "analyst" | "admin" | "super_admin";
export type AdminPermission =
  | "admin.access"
  | "users.read"
  | "users.write"
  | "users.ban"
  | "listings.moderate"
  | "fraud.review"
  | "reports.review"
  | "disputes.decide"
  | "transactions.monitor"
  | "payments.monitor"
  | "ai.monitor"
  | "analytics.search"
  | "analytics.revenue"
  | "trust.override"
  | "audit.read"
  | "workflows.manage";

export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  support: ["admin.access", "users.read", "reports.review", "disputes.decide", "transactions.monitor", "audit.read"],
  moderator: ["admin.access", "users.read", "listings.moderate", "reports.review", "fraud.review", "ai.monitor", "audit.read"],
  risk: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "trust.override", "audit.read"],
  finance: ["admin.access", "users.read", "transactions.monitor", "payments.monitor", "disputes.decide", "analytics.revenue", "audit.read"],
  analyst: ["admin.access", "analytics.search", "analytics.revenue", "transactions.monitor", "payments.monitor", "audit.read"],
  admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage"],
  super_admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage"]
};

export const permissionLabels: Record<AdminPermission, string> = {
  "admin.access": "Access admin console",
  "users.read": "View users",
  "users.write": "Edit users",
  "users.ban": "Ban or suspend users",
  "listings.moderate": "Moderate listings",
  "fraud.review": "Review fraud alerts",
  "reports.review": "Resolve reports",
  "disputes.decide": "Decide disputes",
  "transactions.monitor": "Monitor transactions",
  "payments.monitor": "Monitor payments and payouts",
  "ai.monitor": "Monitor AI tasks",
  "analytics.search": "View search analytics",
  "analytics.revenue": "View revenue analytics",
  "trust.override": "Override trust scores",
  "audit.read": "Read audit logs",
  "workflows.manage": "Manage moderation workflows"
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export function getAdminRole(user: Pick<UserRow, "role" | "metadata"> | null | undefined): AdminRole | null {
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) return null;
  if (user.role === "super_admin") return "super_admin";
  const metadata = user.metadata as Record<string, unknown> | null;
  const configuredRole = metadata?.admin_role;
  if (typeof configuredRole === "string" && configuredRole in rolePermissions) return configuredRole as AdminRole;
  return "admin";
}

export function can(role: AdminRole | null, permission: AdminPermission) {
  return !!role && rolePermissions[role].includes(permission);
}

export async function requireAdminPermission(permission: AdminPermission = "admin.access") {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,email,role,status,metadata")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = getAdminRole(user as Pick<UserRow, "role" | "metadata"> | null);
  if (userError || !user || user.status !== "active" || !can(role, permission)) {
    return { error: NextResponse.json({ error: "Admin permission denied.", permission }, { status: 403 }) } as const;
  }

  return { supabase, authUser: authData.user, adminUser: user, role } as const;
}
