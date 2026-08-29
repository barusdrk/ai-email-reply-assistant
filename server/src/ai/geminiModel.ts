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
    "embedding",
    "embed",
    "tts",
    "transcribe",
    "live",
    "audio",
    "video",
    "robotics",
    "computer-use",
    "computer_use",
    "deep-research",
    "deep-research",
    "veo",
  ];

  if (excluded.some((name) => lower.includes(name))) {
    return false;
  }

  return (
    lower.includes("flash") ||
    lower.includes("pro")
  );
}

function isProductionModel(id: string): boolean {
  const lower = id.toLowerCase();

  return ![
    "preview",
    "experimental",
    "exp",
    "beta",
  ].some((name) => lower.includes(name));
}

function modelScore(id: string): number {
  const lower = id.toLowerCase();

  if (lower === "gemini-3.7-flash") return 3700;
  if (lower === "gemini-3.6-flash") return 3600;
  if (lower === "gemini-3.5-flash") return 3500;
  if (lower === "gemini-3.5-flash-lite") return 3450;
  if (lower === "gemini-3.1-flash-lite") return 3100;
  if (lower === "gemini-2.5-flash") return 2500;
  if (lower === "gemini-2.5-flash-lite") return 2450;
  if (lower === "gemini-2.5-pro") return 2400;

  return 0;
}

export async function resolveGeminiModel(): Promise<string> {
  const now = Date.now();

  if (cachedModel && now - cachedAt < CACHE_TTL) {
    return cachedModel;
  }

  const configuredModel = env.GEMINI_MODEL?.trim();

  if (
    configuredModel &&
    configuredModel.toLowerCase() !== "latest"
  ) {
    cachedModel = configuredModel;
    cachedAt = now;

    console.log(
      `Gemini model configured: ${configuredModel}`
    );

    return configuredModel;
  }

  const models = await getClient().models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter(isSupportedModel)
    .filter(isProductionModel)
    .map((id) => ({
      id,
      score: modelScore(id),
    }))
    .filter((model) => model.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.id.localeCompare(a.id);
    });

  const model = candidates[0]?.id;

  if (!model) {
    throw new Error(
      "No compatible Gemini production text model was found."
    );
  }

  cachedModel = model;
  cachedAt = now;

  console.log(
    `Gemini model resolved: ${model}`
  );

  return model;
}
