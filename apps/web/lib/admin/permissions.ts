import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
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
  | "workflows.manage"
  | "platform.rbac"
  | "platform.audit"
  | "platform.operations";

export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  support: ["admin.access", "users.read", "reports.review", "disputes.decide", "transactions.monitor", "audit.read"],
  moderator: ["admin.access", "users.read", "listings.moderate", "reports.review", "fraud.review", "ai.monitor", "audit.read"],
  risk: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "trust.override", "audit.read"],
  finance: ["admin.access", "users.read", "transactions.monitor", "payments.monitor", "disputes.decide", "analytics.revenue", "audit.read"],
  analyst: ["admin.access", "analytics.search", "analytics.revenue", "transactions.monitor", "payments.monitor", "audit.read"],
  admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage", "platform.operations", "platform.audit"],
  super_admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage", "platform.operations", "platform.audit", "platform.rbac"]
};

export const permissionLabels: Record<AdminPermission, string> = {
  "admin.access": "Access admin console",
  "users.read": "View users",
  "users.write": "Edit users",
  "users.ban": "Ban or suspend users",
  "listings.moderate": "Moderate listings",
  "fraud.review": "Review fraud signals",
  "reports.review": "Resolve reports",
  "disputes.decide": "Decide disputes",
  "transactions.monitor": "Monitor transactions",
  "payments.monitor": "Monitor payments and payouts",
  "ai.monitor": "Monitor AI usage logs",
  "analytics.search": "View search analytics",
  "analytics.revenue": "View revenue analytics",
  "trust.override": "Override trust scores",
  "audit.read": "Read audit logs",
  "workflows.manage": "Manage moderation workflows",
  "platform.rbac": "Manage admin roles and permissions",
  "platform.audit": "Export and govern platform audit trails",
  "platform.operations": "Execute platform operations"
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type AdminAuthorizationSuccess = {
  authorized: true;
  supabase: ReturnType<typeof createClient>;
  authUser: NonNullable<Awaited<ReturnType<ReturnType<typeof createClient>["auth"]["getUser"]>>["data"]["user"]>;
  adminUser: Pick<UserRow, "id" | "email" | "role" | "status" | "metadata">;
  role: AdminRole;
};
type AdminAuthorizationFailure = {
  authorized: false;
  status: 401 | 403;
  message: string;
  permission: AdminPermission;
};

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

export async function getAdminAuthorization(permission: AdminPermission = "admin.access"): Promise<AdminAuthorizationSuccess | AdminAuthorizationFailure> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { authorized: false, status: 401, message: "Authentication required.", permission };
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,email,role,status,metadata")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = getAdminRole(user as Pick<UserRow, "role" | "metadata"> | null);
  if (userError || !user || user.status !== "active" || !can(role, permission)) {
    return { authorized: false, status: 403, message: "Admin permission denied.", permission };
  }

  return { authorized: true, supabase, authUser: authData.user, adminUser: user, role } as AdminAuthorizationSuccess;
}

export async function requireAdminPermission(permission: AdminPermission = "admin.access") {
  const auth = await getAdminAuthorization(permission);
  if (!auth.authorized) {
    return { error: NextResponse.json({ error: auth.message, permission }, { status: auth.status }) } as const;
  }

  return auth;
}

export async function requireAdminPagePermission(
  permission: AdminPermission = "admin.access",
  options: { loginNext?: string; deniedPath?: string } = {}
) {
  const auth = await getAdminAuthorization(permission);
  if (auth.authorized) return auth;

  if (auth.status === 401) {
    const next = encodeURIComponent(options.loginNext ?? "/admin");
    redirect(`/login?next=${next}`);
  }

  const deniedPath = options.deniedPath ?? "/dashboard";
  const separator = deniedPath.includes("?") ? "&" : "?";
  redirect(`${deniedPath}${separator}adminDenied=1&permission=${encodeURIComponent(permission)}`);
}
