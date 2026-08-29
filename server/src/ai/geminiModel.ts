import OpenAI from "openai";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured.");
  return new OpenAI({
    apiKey: env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

function isCompatibleModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!lower.startsWith("gemini-")) return false;
  if (lower.includes("preview")) return false;
  if (lower.includes("image")) return false;
  if (lower.includes("audio")) return false;
  if (lower.includes("live")) return false;
  if (lower.includes("tts")) return false;
  if (lower.includes("transcribe")) return false;
  if (lower.includes("embedding")) return false;
  if (lower.includes("robotics")) return false;
  if (lower.includes("computer-use")) return false;
  if (lower.includes("deep-research")) return false;
  return lower.includes("flash") || lower.includes("pro");
}

function modelScore(id: string): number {
  const match = id.match(/^gemini-(\d+)\.(\d+)-(flash|pro)/i);
  if (!match) return 0;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const type = match[3].toLowerCase() === "pro" ? 0.5 : 0;
  return major * 100 + minor + type;
}

export async function resolveGeminiModel(): Promise<string> {
  const now = Date.now();
  if (cachedModel && now - cachedAt < CACHE_TTL) return cachedModel;

  const configuredModel = env.GEMINI_MODEL?.trim();
  if (configuredModel && configuredModel !== "latest") {
    cachedModel = configuredModel;
    cachedAt = now;
    return configuredModel;
  }

  const models = await getClient().models.list();
  const candidates = models.data
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter(isCompatibleModel)
    .sort((a, b) => modelScore(b) - modelScore(a));

  const model = candidates[0];

  if (!model) {
    throw new Error("No compatible Gemini text model was found.");
  }

  cachedModel = model;
  cachedAt = now;
  console.log(`Gemini model: ${model}`);
  return model;
}
