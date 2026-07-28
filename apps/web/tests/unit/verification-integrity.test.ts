import { describe, expect, it, vi } from "vitest";
import { submitVerificationCheck } from "@/lib/trust-safety/service";

describe("verification claim integrity", () => {
  it("always creates a pending self-attested submission without client evidence", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "check-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ upsert }),
      rpc,
    };

    await submitVerificationCheck(supabase as never, "user-1", {
      checkType: "identity",
      note: "Please review my submission.",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        check_type: "identity",
        status: "pending",
        provider: "marketplace_self_attested",
        provider_check_id: null,
        verified_at: null,
        confidence_score: null,
        evidence: {},
      }),
      { onConflict: "user_id,check_type" },
    );
    expect(rpc).toHaveBeenCalledWith("recompute_user_trust_score", { p_user_id: "user-1" });
  });
});
