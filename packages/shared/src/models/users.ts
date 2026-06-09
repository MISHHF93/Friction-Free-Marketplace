import { z } from "zod";
import { BaseEntitySchema, EmailSchema, EntityIdSchema, IsoDateTimeSchema } from "./common";

export const UserRoleSchema = z.enum(["buyer", "seller", "admin", "support", "moderator"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(["invited", "active", "suspended", "deactivated"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const AuthProviderSchema = z.enum(["email", "google", "apple", "github", "sso"]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const UserSchema = BaseEntitySchema.extend({
  email: EmailSchema,
  roles: z.array(UserRoleSchema).min(1),
  status: UserStatusSchema,
  authProvider: AuthProviderSchema,
  emailVerifiedAt: IsoDateTimeSchema.nullable(),
  lastLoginAt: IsoDateTimeSchema.nullable(),
  disabledReason: z.string().trim().max(500).nullable().optional(),
});
export interface User extends z.infer<typeof UserSchema> {}

export const CreateUserDtoSchema = z.object({
  email: EmailSchema,
  roles: z.array(UserRoleSchema).min(1).default(["buyer"]),
  authProvider: AuthProviderSchema.default("email"),
});
export interface CreateUserDto extends z.infer<typeof CreateUserDtoSchema> {}

export const UpdateUserDtoSchema = z.object({
  roles: z.array(UserRoleSchema).min(1).optional(),
  status: UserStatusSchema.optional(),
  disabledReason: z.string().trim().max(500).nullable().optional(),
});
export interface UpdateUserDto extends z.infer<typeof UpdateUserDtoSchema> {}

export const PublicUserDtoSchema = z.object({
  id: EntityIdSchema,
  roles: z.array(UserRoleSchema).min(1),
  status: UserStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export interface PublicUserDto extends z.infer<typeof PublicUserDtoSchema> {}

export const AdminUserDtoSchema = UserSchema.extend({
  riskFlags: z.array(z.string().trim().min(1).max(80)).default([]),
});
export interface AdminUserDto extends z.infer<typeof AdminUserDtoSchema> {}
