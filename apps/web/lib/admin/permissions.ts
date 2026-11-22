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
  | "platform.operations"
  | "ads.manage";

export const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  support: ["admin.access", "users.read", "reports.review", "disputes.decide", "transactions.monitor", "audit.read"],
  moderator: ["admin.access", "users.read", "listings.moderate", "reports.review", "fraud.review", "ai.monitor", "audit.read"],
  risk: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "trust.override", "audit.read"],
  finance: ["admin.access", "users.read", "transactions.monitor", "payments.monitor", "disputes.decide", "analytics.revenue", "audit.read"],
  analyst: ["admin.access", "analytics.search", "analytics.revenue", "transactions.monitor", "payments.monitor", "audit.read"],
  admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage", "platform.operations", "platform.audit", "ads.manage"],
  super_admin: ["admin.access", "users.read", "users.write", "users.ban", "listings.moderate", "fraud.review", "reports.review", "disputes.decide", "transactions.monitor", "payments.monitor", "ai.monitor", "analytics.search", "analytics.revenue", "trust.override", "audit.read", "workflows.manage", "platform.operations", "platform.audit", "platform.rbac", "ads.manage"]
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
  "platform.operations": "Execute platform operations",
  "ads.manage": "Manage sponsored placements"
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type AdminAuthorizationSuccess = {
  authorized: true;
  supabase: Awaited<ReturnType<typeof createClient>>;
  authUser: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]>;
  adminUser: Pick<UserRow, "id" | "email" | "role" | "status" | "metadata">;
  role: AdminRole;
};
type AdminAuthorizationFailure = {
  authorized: false;
  status: 401 | 403;
  message: string;
  permission: AdminPermission;
};

const limitedStaffRoles = new Set<AdminRole>(["support", "moderator", "risk", "finance", "analyst"]);

function narrowedStaffRole(metadata: UserRow["metadata"]): AdminRole | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const requested = (metadata as { admin_role?: unknown }).admin_role;
  return typeof requested === "string" && limitedStaffRoles.has(requested as AdminRole) ? requested as AdminRole : null;
}

export function getAdminRole(user: Pick<UserRow, "role" | "metadata"> | null | undefined): AdminRole | null {
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) return null;
  if (user.role === "super_admin") return "super_admin";
  return narrowedStaffRole(user.metadata) ?? "admin";
}

const adminRank: Record<string, number> = {
  support: 1,
  analyst: 1,
  moderator: 2,
  finance: 2,
  risk: 3,
  admin: 4,
  super_admin: 5
};

export function adminRankFor(user: { role?: string | null; metadata?: unknown } | null | undefined) {
  const resolved = getAdminRole(user as Pick<UserRow, "role" | "metadata"> | null);
  return resolved ? adminRank[resolved] ?? 0 : 0;
}

export function canRestrictUser(actor: { id: string; role?: string | null; metadata?: unknown }, target: { id: string; role?: string | null; metadata?: unknown }) {
  if (!actor.id || actor.id === target.id) return false;
  const role = getAdminRole(actor as Pick<UserRow, "role" | "metadata">);
  if (!can(role, "users.ban")) return false;
  return adminRankFor(actor) > adminRankFor(target);
}

export function can(role: AdminRole | null, permission: AdminPermission) {
  return !!role && rolePermissions[role].includes(permission);
}

export async function getAdminAuthorization(permission: AdminPermission = "admin.access"): Promise<AdminAuthorizationSuccess | AdminAuthorizationFailure> {
  const supabase = await createClient();
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
