import { z, type ZodError, type ZodTypeAny } from "zod";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  issues: ValidationIssue[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface SchemaValidator<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): ValidationResult<T>;
  is(input: unknown): input is T;
  assert(input: unknown): asserts input is T;
}

export class ValidationException extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], message = "Validation failed") {
    super(message);
    this.name = "ValidationException";
    this.issues = issues;
  }
}

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    code: issue.code,
    message: issue.message,
  }));
}

export function parseSchema<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  return schema.parse(input);
}

export function safeParseSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): ValidationResult<z.infer<TSchema>> {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    issues: formatZodIssues(result.error),
  };
}

export function assertSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): asserts input is z.infer<TSchema> {
  const result = safeParseSchema(schema, input);

  if (!result.success) {
    throw new ValidationException(result.issues);
  }
}

export function isSchema<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown): input is z.infer<TSchema> {
  return schema.safeParse(input).success;
}

export function createSchemaValidator<TSchema extends ZodTypeAny>(
  schema: TSchema,
): SchemaValidator<z.infer<TSchema>> {
  return {
    parse: (input) => parseSchema(schema, input),
    safeParse: (input) => safeParseSchema(schema, input),
    is: (input): input is z.infer<TSchema> => isSchema(schema, input),
    assert: (input): asserts input is z.infer<TSchema> => assertSchema(schema, input),
  };
}
