import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;

const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.ANTHROPIC_API_KEY) throw new Error("Claude is not configured.");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

function isSupportedModel(id: string): boolean {
  const lower = id.toLowerCase();

  if (!lower.startsWith("claude-")) return false;

  const excluded = [
    "instant",
    "embedding",
    "embed",
    "moderation",
    "audio",
    "speech",
    "image",
    "vision",
  ];

  if (excluded.some((name) => lower.includes(name))) {
    return false;
  }

  if (
    !lower.includes("opus") &&
    !lower.includes("sonnet") &&
    !lower.includes("haiku")
  ) {
    return false;
  }

  return true;
}

function modelScore(id: string): number {
  const lower = id.toLowerCase();

  if (lower.includes("claude-opus-4-8")) return 4800;
  if (lower.includes("claude-opus-4-7")) return 4700;
  if (lower.includes("claude-opus-4-6")) return 4600;
  if (lower.includes("claude-opus-4-5")) return 4500;
  if (lower.includes("claude-opus-4")) return 4400;

  if (lower.includes("claude-sonnet-4-8")) return 3800;
  if (lower.includes("claude-sonnet-4-7")) return 3700;
  if (lower.includes("claude-sonnet-4-6")) return 3600;
  if (lower.includes("claude-sonnet-4-5")) return 3500;
  if (lower.includes("claude-sonnet-4")) return 3400;

  if (lower.includes("claude-haiku-4-5")) return 2500;
  if (lower.includes("claude-haiku-4")) return 2400;

  if (lower.includes("claude-3-7-sonnet")) return 1700;
  if (lower.includes("claude-3-5-sonnet")) return 1600;
  if (lower.includes("claude-3-5-haiku")) return 1500;
  if (lower.includes("claude-3-opus")) return 1400;
  if (lower.includes("claude-3-sonnet")) return 1300;
  if (lower.includes("claude-3-haiku")) return 1200;

  return 0;
}

function isPreviewModel(id: string): boolean {
  const lower = id.toLowerCase();

  return [
    "preview",
    "experimental",
    "beta",
    "test",
  ].some((name) => lower.includes(name));
}

export async function resolveClaudeModel(): Promise<string> {
  const now = Date.now();

  if (cachedModel && now - cachedAt < CACHE_TTL) {
    return cachedModel;
  }

  const configuredModel = env.CLAUDE_MODEL?.trim();

  if (
    configuredModel &&
    configuredModel.toLowerCase() !== "latest"
  ) {
    cachedModel = configuredModel;
    cachedAt = now;

    console.log(
      `Claude model configured: ${configuredModel}`
    );

    return configuredModel;
  }

  const models = await getClient().models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter(isSupportedModel)
    .filter((id) => !isPreviewModel(id))
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
      "No compatible Claude production text model was found."
    );
  }

  cachedModel = model;
  cachedAt = now;

  console.log(
    `Claude model resolved: ${model}`
  );

  return model;
}
