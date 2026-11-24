import { z } from "zod";

/**
 * Plain-language fallbacks for zod issues that have no custom message.
 * zod 4's defaults read like "Invalid input: expected string, received undefined",
 * which can reach people through form and API errors. Schemas that pass their own
 * message keep it; anything not handled here falls back to zod's default.
 */
export function friendlyZodMessage(issue: { code?: string; input?: unknown; expected?: unknown }): string | undefined {
  if (issue.code === "invalid_type") {
    const missing = issue.input === undefined || issue.input === null || issue.input === "";
    if (missing) return "This field is required.";
    if (issue.expected === "number" || (typeof issue.input === "number" && Number.isNaN(issue.input))) return "Enter a number.";
    if (issue.expected === "boolean") return "Choose yes or no.";
    if (issue.expected === "array") return "Choose at least one option.";
    return "This value isn't valid.";
  }
  if (issue.code === "invalid_value") {
    return issue.input === undefined || issue.input === "" ? "This field is required." : "Choose one of the available options.";
  }
  if (issue.code === "invalid_format") return "This value isn't in the right format.";
  return undefined;
}

z.config({ customError: (issue) => friendlyZodMessage(issue as Parameters<typeof friendlyZodMessage>[0]) });
