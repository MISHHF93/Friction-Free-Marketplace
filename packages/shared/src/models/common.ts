import { z } from "zod";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), z.record(JsonValueSchema)]),
);

export const EntityIdSchema = z.string().uuid();
export const SlugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const EmailSchema = z.string().trim().toLowerCase().email().max(320);
export const UrlSchema = z.string().url().max(2048);
export const CountryCodeSchema = z.string().regex(/^[A-Z]{2}$/);

export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: CurrencyCodeSchema,
});
export interface Money extends z.infer<typeof MoneySchema> {}

export const PositiveMoneySchema = MoneySchema.extend({
  amountMinor: z.number().int().nonnegative(),
});
export interface PositiveMoney extends z.infer<typeof PositiveMoneySchema> {}

export const PercentageBasisPointsSchema = z.number().int().min(0).max(10_000);

export const AddressSchema = z.object({
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(1).max(32),
  country: CountryCodeSchema,
});
export interface Address extends z.infer<typeof AddressSchema> {}

export const LocationSchema = z.object({
  city: z.string().trim().min(1).max(80).nullable().optional(),
  region: z.string().trim().min(1).max(80).nullable().optional(),
  country: CountryCodeSchema.nullable().optional(),
});
export interface Location extends z.infer<typeof LocationSchema> {}

export const ImageAssetSchema = z.object({
  id: EntityIdSchema,
  url: UrlSchema,
  altText: z.string().trim().max(180).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export interface ImageAsset extends z.infer<typeof ImageAssetSchema> {}

export const TimestampFieldsSchema = z.object({
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export interface TimestampFields extends z.infer<typeof TimestampFieldsSchema> {}

export const BaseEntitySchema = TimestampFieldsSchema.extend({
  id: EntityIdSchema,
});
export interface BaseEntity extends z.infer<typeof BaseEntitySchema> {}

export const PaginationRequestSchema = z.object({
  cursor: z.string().min(1).max(512).nullable().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export interface PaginationRequest extends z.infer<typeof PaginationRequestSchema> {}

export const PaginationMetaSchema = z.object({
  nextCursor: z.string().min(1).max(512).nullable(),
  hasMore: z.boolean(),
});
export interface PaginationMeta extends z.infer<typeof PaginationMetaSchema> {}

export const ApiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1).max(500),
  details: JsonValueSchema.optional(),
  requestId: z.string().min(1).max(128).optional(),
});
export interface ApiError extends z.infer<typeof ApiErrorSchema> {}

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;
