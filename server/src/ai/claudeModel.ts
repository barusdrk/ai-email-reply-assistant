import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";

let cachedModel: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000;

function getClient() {
  if (!env.ANTHROPIC_API_KEY) throw new Error("Claude is not configured.");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

function isTextModel(id: string): boolean {
  const lower = id.toLowerCase();
  return lower.includes("claude-sonnet") || lower.includes("claude-opus") || lower.includes("claude-haiku");
}

export async function resolveClaudeModel(): Promise<string> {
  const now = Date.now();
  if (cachedModel && now - cachedAt < CACHE_TTL) return cachedModel;

  const configuredModel = env.CLAUDE_MODEL?.trim();
  if (configuredModel && configuredModel !== "latest") {
    cachedModel = configuredModel;
    cachedAt = now;
    return configuredModel;
  }

  const models = await getClient().models.list();
  const candidates = models.data.filter((model) => model.id && isTextModel(model.id));
  const model = candidates[0]?.id;

  if (!model) throw new Error("No compatible Claude text model was found.");

  cachedModel = model;
  cachedAt = now;
  console.log(`Claude model: ${model}`);
  return model;
}
