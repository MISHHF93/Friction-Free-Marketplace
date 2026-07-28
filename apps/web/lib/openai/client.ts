import OpenAI from "openai";
import { env } from "@/lib/env.server";

export const OPENAI_REQUEST_TIMEOUT_MS = 20_000;

export function isOpenAIConfigured() {
  const key = env.OPENAI_API_KEY;
  return Boolean(key && !key.includes("placeholder"));
}

export function getOpenAI() {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: OPENAI_REQUEST_TIMEOUT_MS,
    maxRetries: 1
  });
}
