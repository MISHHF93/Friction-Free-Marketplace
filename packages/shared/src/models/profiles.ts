import { z } from "zod";
import { BaseEntitySchema, LocationSchema, UrlSchema } from "./common";
import { UserSchema } from "./users";

export const ProfileTypeSchema = z.enum(["personal", "business"]);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const SellerVerificationStatusSchema = z.enum(["not_started", "pending", "verified", "rejected"]);
export type SellerVerificationStatus = z.infer<typeof SellerVerificationStatusSchema>;

export const SocialLinksSchema = z.object({
  website: UrlSchema.nullable().optional(),
  instagram: UrlSchema.nullable().optional(),
  x: UrlSchema.nullable().optional(),
  linkedin: UrlSchema.nullable().optional(),
});
export interface SocialLinks extends z.infer<typeof SocialLinksSchema> {}

export const SellerProfileSchema = z.object({
  storeName: z.string().trim().min(2).max(100),
  storeSlug: z.string().trim().min(3).max(120),
  verificationStatus: SellerVerificationStatusSchema,
  stripeAccountId: z.string().trim().min(1).max(255).nullable(),
  averageResponseMinutes: z.number().int().nonnegative().nullable(),
  totalSales: z.number().int().nonnegative(),
});
export interface SellerProfile extends z.infer<typeof SellerProfileSchema> {}

export const ProfileSchema = BaseEntitySchema.extend({
  userId: UserSchema.shape.id,
  type: ProfileTypeSchema,
  displayName: z.string().trim().min(2).max(100),
  avatarUrl: UrlSchema.nullable(),
  bio: z.string().trim().max(1_000).nullable(),
  location: LocationSchema.nullable(),
  socialLinks: SocialLinksSchema.default({}),
  seller: SellerProfileSchema.nullable(),
});
export interface Profile extends z.infer<typeof ProfileSchema> {}

export const UpsertProfileDtoSchema = z.object({
  type: ProfileTypeSchema,
  displayName: z.string().trim().min(2).max(100),
  avatarUrl: UrlSchema.nullable().optional(),
  bio: z.string().trim().max(1_000).nullable().optional(),
  location: LocationSchema.nullable().optional(),
  socialLinks: SocialLinksSchema.optional(),
});
export interface UpsertProfileDto extends z.infer<typeof UpsertProfileDtoSchema> {}

export const PublicProfileDtoSchema = ProfileSchema.pick({
  id: true,
  userId: true,
  type: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  location: true,
  seller: true,
  createdAt: true,
});
export interface PublicProfileDto extends z.infer<typeof PublicProfileDtoSchema> {}
