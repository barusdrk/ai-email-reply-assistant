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

function isSupportedModel(id: string): boolean {
  const lower = id.toLowerCase();

  if (!lower.startsWith("gemini-")) return false;

  const excluded = [
    "image",
    "live",
    "tts",
    "audio",
    "transcribe",
    "embedding",
    "robotics",
    "veo",
    "imagen",
    "vision",
  ];

  if (excluded.some((name) => lower.includes(name))) return false;

  if (!lower.includes("flash")) return false;

  if (lower.includes("preview")) return false;

  return true;
}

function modelScore(id: string): number {
  const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash/i);

  if (!match) return 0;

  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);

  return major * 100 + minor;
}

export async function resolveGeminiModel(): Promise<string> {
  const now = Date.now();

  if (cachedModel && now - cachedAt < CACHE_TTL) {
    return cachedModel;
  }

  const configuredModel = env.GEMINI_MODEL?.trim();

  if (configuredModel && configuredModel !== "latest") {
    cachedModel = configuredModel;
    cachedAt = now;
    console.log(`Gemini model: ${configuredModel}`);
    return configuredModel;
  }

  const models = await getClient().models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter(isSupportedModel)
    .sort((a, b) => {
      const scoreDifference = modelScore(b) - modelScore(a);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return b.localeCompare(a);
    });

  const model = candidates[0];

  if (!model) {
    throw new Error("No compatible Gemini Flash text model was found.");
  }

  cachedModel = model;
  cachedAt = now;

  console.log(`Gemini model: ${model}`);

  return model;
}
