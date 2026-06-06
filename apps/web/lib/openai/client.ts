import OpenAI from "openai";
import { env } from "@/lib/env.server";

export function getOpenAI() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
