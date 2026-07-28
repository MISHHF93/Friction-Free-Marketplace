import { describe, expect, it } from "vitest";
import { sanitizeAgentInput } from "@/lib/ai/request-context";

describe("AI request context boundary", () => {
  it("keeps only server-approved client context fields", () => {
    const result = sanitizeAgentInput({
      agent: "buyer",
      message: "Help me compare this listing.",
      context: {
        listingId: "8b84cb30-6c1b-47cb-b46d-04aeb1c84fc2",
        userRole: "admin",
        locale: "en-CA",
        metadata: {
          pathname: "/listings/8b84cb30-6c1b-47cb-b46d-04aeb1c84fc2",
          secret: "must-not-reach-model-or-audit",
          permissions: ["super-admin"],
        },
      },
    });

    expect(result.context).toEqual({
      listingId: "8b84cb30-6c1b-47cb-b46d-04aeb1c84fc2",
      conversationId: undefined,
      locale: "en-CA",
      metadata: { pathname: "/listings/8b84cb30-6c1b-47cb-b46d-04aeb1c84fc2" },
    });
  });

  it("rejects external URLs posing as route context", () => {
    const result = sanitizeAgentInput({
      agent: "support",
      message: "Help",
      context: { metadata: { pathname: "https://attacker.example/prompt" } },
    });

    expect(result.context?.metadata).toBeUndefined();
  });
});
