import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "@/app/api/favorites/[listingId]/route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

const listingId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

function mockSupabase(user: { id: string } | null) {
  const eq = vi.fn();
  const deleteChain = { eq };
  eq.mockReturnValue(deleteChain);
  const from = vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn(() => deleteChain)
  }));
  vi.mocked(createClient).mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from
  } as any);
  return { from, eq };
}

describe("favorites API RLS-sensitive behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication before mutating favorites", async () => {
    mockSupabase(null);

    const response = await PUT(new Request("http://test.local"), { params: { listingId } });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in to manage favorites." });
  });

  it("rejects invalid listing ids before database writes", async () => {
    const { from } = mockSupabase({ id: userId });

    const response = await PUT(new Request("http://test.local"), { params: { listingId: "not-a-uuid" } });

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("upserts favorites scoped to the authenticated user", async () => {
    const { from } = mockSupabase({ id: userId });

    const response = await PUT(new Request("http://test.local"), { params: { listingId } });

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("favorites");
    expect(from.mock.results[0].value.upsert).toHaveBeenCalledWith(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true }
    );
  });

  it("deletes favorites with both user and listing predicates", async () => {
    const { eq } = mockSupabase({ id: userId });

    const response = await DELETE(new Request("http://test.local"), { params: { listingId } });

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("user_id", userId);
    expect(eq).toHaveBeenCalledWith("listing_id", listingId);
  });
});
