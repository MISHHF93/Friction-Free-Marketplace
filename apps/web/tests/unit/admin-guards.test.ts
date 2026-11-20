import { describe, expect, it } from "vitest";
import { adminActionControls, adminActionRequest } from "@/components/admin/admin-row-actions";
import { canRestrictUser } from "@/lib/admin/permissions";
import { escrowLeaseExpired, prepareEscrowAction, refundPlan } from "@/lib/payments/resume";
import { displayNameError, memberDisplayName } from "@/lib/validations/auth";

describe("admin row actions", () => {
  it("sends the action that was clicked", () => {
    const controls = adminActionControls(["suspend", "ban", "reinstate"]);
    const clicked = controls.find((control) => control.label === "reinstate");
    expect(clicked?.action).toBe("reinstate");
    expect(adminActionRequest(clicked!.action, "11111111-1111-4111-8111-111111111111", "Needs review").action).toBe("reinstate");
    expect(controls.map((control) => control.action)).toEqual(["suspend", "ban", "reinstate"]);
    expect(controls.find((control) => control.action === "ban")?.destructive).toBe(true);
  });
});

describe("account restriction hierarchy", () => {
  const admin = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin", metadata: { admin_role: "support" } };
  const otherAdmin = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", role: "admin", metadata: {} };
  const buyer = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", role: "buyer", metadata: { admin_role: "super_admin" } };
  const superAdmin = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", role: "super_admin", metadata: {} };

  it("lets a full admin restrict a buyer and refuses limited staff, self, and metadata escalation", () => {
    expect(canRestrictUser(otherAdmin, buyer)).toBe(true);
    expect(canRestrictUser(admin, buyer)).toBe(false);
    expect(canRestrictUser(admin, admin)).toBe(false);
    expect(canRestrictUser(admin, otherAdmin)).toBe(false);
    expect(canRestrictUser(superAdmin, otherAdmin)).toBe(true);
    expect(canRestrictUser(buyer, otherAdmin)).toBe(false);
  });
});

describe("escrow resume lease", () => {
  it("does not resume a claim that is still inside the lease", () => {
    expect(escrowLeaseExpired(new Date().toISOString())).toBe(false);
    expect(escrowLeaseExpired(new Date(Date.now() - 3 * 60 * 1000).toISOString())).toBe(true);
    expect(escrowLeaseExpired(null)).toBe(false);
  });

  it("does not let a second caller proceed during the lease", async () => {
    let updates = 0;
    const supabase = {
      from() {
        updates += 1;
        return { update: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) }) }) };
      }
    };
    const result = await prepareEscrowAction(supabase, { id: "pay", status: "refunding", updated_at: new Date().toISOString(), metadata: {} }, "held", "refunding");
    expect(result.payment).toBeNull();
    expect(updates).toBe(0);
  });

  it("reuses the stored refund amount and ignores a different request", () => {
    const plan = refundPlan({
      metadata: { refund_in_flight: { amountCents: 250, reason: "requested_by_customer", idempotencyKey: "refund:tx:pay:250:requested_by_customer" } }
    }, { amountCents: 900, reason: "fraudulent", idempotencyKey: "other" });
    expect(plan).toMatchObject({ amountCents: 250, reason: "requested_by_customer", resumed: true });
  });
});

describe("display names", () => {
  it("rejects empty, email-like, and impersonating names", () => {
    expect(displayNameError("")).toMatch(/2 characters/);
    expect(displayNameError("ada@example.com")).toMatch(/email/);
    expect(displayNameError("Marketplace Admin")).toMatch(/reserved/);
    expect(displayNameError("Support Team")).toMatch(/reserved/);
    expect(displayNameError("Ada Lovelace")).toBeNull();
    expect(memberDisplayName("11111111-1111-4111-8111-111111111111")).toBe("Member 1111");
  });
});
