import { env } from "../config/env.js";

export async function resolveGeminiModel(): Promise<string> {
  const model = env.GEMINI_MODEL?.trim();

  if (!model) {
    throw new Error("Gemini model is not configured.");
  }

  return model;
}
