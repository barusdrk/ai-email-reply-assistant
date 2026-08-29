import OpenAI from "openai";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.GROQ_API_KEY) throw new Error("Groq is not configured.");
  return new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
}

function isTextModel(id: string): boolean {
  const lower = id.toLowerCase();
  const excluded = ["whisper", "tts", "speech", "audio", "guard", "safety", "compound", "embed", "vision"];
  return !excluded.some((name) => lower.includes(name));
}

export async function resolveGroqModel(): Promise<string> {
  const now = Date.now();
  if (cachedModel && now - cachedAt < CACHE_TTL) return cachedModel;

  const configuredModel = env.GROQ_MODEL?.trim();
  if (configuredModel && configuredModel !== "latest") {
    cachedModel = configuredModel;
    cachedAt = now;
    return configuredModel;
  }

  const models = await getClient().models.list();
  const candidates = models.data.filter((model) => model.id && isTextModel(model.id));
  const model = candidates.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]?.id;

  if (!model) throw new Error("No compatible Groq text model was found.");

  cachedModel = model;
  cachedAt = now;
  console.log(`Groq model: ${model}`);
  return model;
}
