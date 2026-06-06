import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const signupSchema = authSchema.extend({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(80, "Display name must be 80 characters or fewer.")
});

const optionalTrimmedString = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(""));

export const profileSettingsSchema = z.object({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(80, "Display name must be 80 characters or fewer."),
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
