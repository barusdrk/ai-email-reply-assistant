import OpenAI from "openai";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;

const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

function isSupportedModel(id: string): boolean {
  const lower = id.toLowerCase();

  if (!lower.startsWith("gpt-")) {
    return false;
  }

  const excluded = [
    "image",
    "realtime",
    "transcribe",
    "tts",
    "audio",
    "search",
    "embedding",
    "moderation",
    "codex",
    "computer",
  ];

  return !excluded.some((name) =>
    lower.includes(name)
  );
}

function modelScore(id: string): number {
  const match = id.match(/^gpt-(\d+(?:\.\d+)?)/i);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

export async function resolveOpenAIModel(): Promise<string> {
  const now = Date.now();

  if (
    cachedModel &&
    now - cachedAt < CACHE_TTL
  ) {
    return cachedModel;
  }

  const configuredModel = env.OPENAI_MODEL?.trim();

  if (
    configuredModel &&
    configuredModel !== "latest"
  ) {
    cachedModel = configuredModel;
    cachedAt = now;
    return configuredModel;
  }

  const client = getClient();

  const models = await client.models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter(isSupportedModel)
    .sort((a, b) => {
      const versionDifference =
        modelScore(b) - modelScore(a);

      if (versionDifference !== 0) {
        return versionDifference;
      }

      return b.localeCompare(a);
    });

  const model = candidates[0];

  if (!model) {
    throw new Error(
      "No compatible OpenAI text model was found."
    );
  }

  cachedModel = model;
  cachedAt = now;

  console.log(
    `OpenAI model resolved: ${model}`
  );

  return model;
}
