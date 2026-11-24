import { describe, expect, it } from "vitest";
import { z } from "zod";
import "@/lib/validation/zod-messages";
import { authSchema } from "@/lib/validations/auth";

describe("plain-language validation messages (zod 4)", () => {
  it("says a missing field is required instead of zod's technical default", () => {
    const result = authSchema.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("This field is required.");
    expect(messages.join(" ")).not.toMatch(/expected|received|undefined/i);
  });

  it("keeps a schema's own message", () => {
    const result = authSchema.safeParse({ email: "nope", password: "x" });
    expect(result.error!.issues.map((issue) => issue.message)).toContain("Enter a valid email address.");
  });

  it("asks for a number and a valid option", () => {
    const schema = z.object({ price: z.number(), size: z.enum(["s", "m"]) });
    const result = schema.safeParse({ price: Number.NaN, size: "xl" });
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(["Enter a number.", "Choose one of the available options."]));
  });
});
