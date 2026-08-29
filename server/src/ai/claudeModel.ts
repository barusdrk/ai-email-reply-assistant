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
  if (!id.trim()) return false;
  if (!lower.includes("claude-")) return false;

  const excluded = [
    "embedding",
    "embed",
    "moderation",
    "audio",
    "speech",
    "image",
    "vision",
  ];

  return !excluded.some((name) => lower.includes(name));
}

function modelScore(id: string): number {
  const lower = id.toLowerCase();

  if (lower.includes("claude-opus-5")) return 1000;
  if (lower.includes("claude-sonnet-5")) return 900;
  if (lower.includes("claude-haiku-4-5")) return 800;
  if (lower.includes("claude-opus-4-8")) return 700;
  if (lower.includes("claude-sonnet-4-6")) return 600;
  if (lower.includes("claude-haiku-4-5")) return 500;

  const match = lower.match(/claude-(?:opus|sonnet|haiku)-(\d+(?:-\d+)?)/);

  if (!match) return 0;

  return Number(match[1].replace("-", "."));
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
    console.log(`Claude model configured: ${configuredModel}`);
    return configuredModel;
  }

  const models = await getClient().models.list();

  const candidates = models.data
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .filter(isSupportedModel)
    .sort((a, b) => {
      const scoreDifference =
        modelScore(b) - modelScore(a);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return b.localeCompare(a);
    });

  const model = candidates[0];

  if (!model) {
    throw new Error(
      "No compatible Claude production text model was found."
    );
  }

  cachedModel = model;
  cachedAt = now;

  console.log(`Claude model resolved: ${model}`);

  return model;
}
