import OpenAI from "openai";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;

const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.GROQ_API_KEY) throw new Error("Groq is not configured.");
  return new OpenAI({
    apiKey: env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function isSupportedModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!id.trim()) return false;
  const excluded = ["whisper", "tts", "speech", "audio", "guard", "safety", "embed", "embedding", "vision", "compound"];
  return !excluded.some((name) => lower.includes(name));
}

function modelScore(id: string): number {
  const lower = id.toLowerCase();
  if (lower === "openai/gpt-oss-120b") return 1000;
  if (lower === "openai/gpt-oss-20b") return 900;
  if (lower === "llama-3.3-70b-versatile") return 800;
  if (lower === "llama-3.1-8b-instant") return 700;

  const match = lower.match(/(?:llama|qwen|mixtral|gemma)[^0-9]*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export async function resolveGroqModel(): Promise<string> {
  const now = Date.now();

  if (cachedModel && now - cachedAt < CACHE_TTL) return cachedModel;

  const configuredModel = env.GROQ_MODEL?.trim();

  if (configuredModel && configuredModel.toLowerCase() !== "latest") {
    cachedModel = configuredModel;
    cachedAt = now;
    console.log(`Groq model configured: ${configuredModel}`);
    return configuredModel;
  }

  const models = await getClient().models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter(isSupportedModel)
    .sort((a, b) => {
      const scoreDifference = modelScore(b) - modelScore(a);
      if (scoreDifference !== 0) return scoreDifference;
      return b.localeCompare(a);
    });

  const model = candidates[0];

  if (!model) throw new Error("No compatible Groq production text model was found.");

  cachedModel = model;
  cachedAt = now;

  console.log(`Groq model resolved: ${model}`);

  return model;
}
