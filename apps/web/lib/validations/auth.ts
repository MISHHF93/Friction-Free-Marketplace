import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export function displayNameError(value: string) {
  const name = value.trim();
  if (name.length < 2) return "Display name must be at least 2 characters.";
  if (name.length > 80) return "Display name must be 80 characters or fewer.";
  if (name.includes("@") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) return "Use a name, not an email address.";
  if (/(^|[^a-z])(admin|support)([^a-z]|$)/i.test(name)) return "That name is reserved.";
  return null;
}

export function memberDisplayName(userId: string) {
  return `Member ${userId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

const displayNameSchema = z.string().trim().superRefine((value, context) => {
  const message = displayNameError(value);
  if (message) context.addIssue({ code: "custom", message });
});

export const signupSchema = authSchema.extend({
  displayName: z.string().trim().optional().or(z.literal("")).superRefine((value, context) => {
    if (!value) return;
    const message = displayNameError(value);
    if (message) context.addIssue({ code: "custom", message });
  })
});

const optionalTrimmedString = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(""));

export const profileSettingsSchema = z.object({
  displayName: displayNameSchema,
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{2,29}$/, "Use 3-30 letters, numbers, underscores, dots, or dashes.")
    .optional()
    .or(z.literal("")),
  bio: optionalTrimmedString(1000, "Bio must be 1,000 characters or fewer."),
  locationLabel: optionalTrimmedString(120, "Location must be 120 characters or fewer."),
  websiteUrl: z.string().trim().url("Enter a valid website URL.").optional().or(z.literal(""))
});

export type AuthFormValues = z.infer<typeof authSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>;
