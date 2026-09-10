import { env } from "../config/env.js";

export async function resolveGroqModel(): Promise<string> {
  const model = env.GROQ_MODEL?.trim();

  if (!model) {
    throw new Error("Groq model is not configured.");
  }

  return model;
}
