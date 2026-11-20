import { describe, expect, it } from "vitest";
import { adminTableRows } from "@/lib/admin/live-pages";

describe("admin live rows", () => {
  it("maps each account from its own database row", () => {
    const rows = adminTableRows("users", [
      { id: "11111111-1111-4111-8111-111111111111", email: "alice@example.com", role: "buyer", status: "active", trust_scores: [{ score: 80 }] },
      { id: "22222222-2222-4222-8222-222222222222", email: "bob@example.com", role: "seller", status: "suspended", trust_scores: [{ score: 20 }] }
    ]);

    expect(rows.map((row) => row.subject)).toEqual(["alice@example.com", "bob@example.com"]);
    expect(rows[0]?.trust).toBe("80");
    expect(rows[1]?.severity).toBe("high");
    expect(rows.some((row) => /maya|garfield|sample/i.test(row.subject))).toBe(false);
  });

  it("returns an empty queue when the table has no records", () => {
    expect(adminTableRows("listings", [])).toEqual([]);
  });
});