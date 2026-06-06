import { formatEnvError, serverEnvSchema, type ServerEnv } from "@/lib/env.shared";

if (typeof window !== "undefined") {
  throw new Error("@/lib/env.server can only be imported from server-side code. Use publicEnv from @/lib/env in client code.");
}

export type { ServerEnv };

export function validateServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    throw new Error(formatEnvError(result.error, "server"));
  }
  return result.data;
}

export const env = validateServerEnv();
