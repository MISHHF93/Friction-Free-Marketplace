import { describe, expect, it } from "vitest";
import { authSchema, profileSettingsSchema, signupSchema } from "@/lib/validations/auth";
import { can, getAdminRole } from "@/lib/admin/permissions";

describe("auth validation", () => {
  it("normalizes and validates login credentials", () => {
    const credentials = authSchema.parse({ email: " buyer@example.com ", password: "super-secret" });

    expect(credentials.email).toBe("buyer@example.com");
    expect(credentials.password).toBe("super-secret");
  });

  it("rejects weak signup payloads", () => {
    expect(() => signupSchema.parse({ displayName: "A", email: "not-email", password: "short" })).toThrow();
  });

  it("accepts optional profile settings without forcing blank fields", () => {
    const profile = profileSettingsSchema.parse({
      displayName: "Marketplace Seller",
      username: "",
      bio: "",
      locationLabel: "Portland, OR",
      websiteUrl: ""
    });

    expect(profile.username).toBe("");
    expect(profile.locationLabel).toBe("Portland, OR");
  });
});

describe("admin permissions", () => {
  it("denies non-admin users at the role boundary", () => {
    expect(getAdminRole({ role: "seller", metadata: {} })).toBeNull();
    expect(can(null, "admin.access")).toBe(false);
  });

  it("keeps privilege on users.role and only lets metadata narrow an admin", () => {
    const moderator = getAdminRole({ role: "admin", metadata: { admin_role: "moderator" } });
    const buyer = getAdminRole({ role: "buyer", metadata: { admin_role: "super_admin" } });
    const unchanged = getAdminRole({ role: "admin", metadata: { admin_role: "super_admin" } });

    expect(moderator).toBe("moderator");
    expect(can(moderator, "listings.moderate")).toBe(true);
    expect(can(moderator, "users.ban")).toBe(false);
    expect(can(moderator, "payments.monitor")).toBe(false);
    expect(buyer).toBeNull();
    expect(unchanged).toBe("admin");
    expect(can(unchanged, "users.ban")).toBe(true);
  });

  it("grants super admins every admin permission", () => {
    const role = getAdminRole({ role: "super_admin", metadata: {} });

    expect(role).toBe("super_admin");
    expect(can(role, "workflows.manage")).toBe(true);
    expect(can(role, "payments.monitor")).toBe(true);
  });
});
