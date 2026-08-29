import { env } from "../config/env.js";

interface GeminiModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
  nextPageToken?: string;
}

let cachedModel: string | null = null;

async function listGeminiModels(): Promise<GeminiModel[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini is not configured.");
  }

  const models: GeminiModel[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      "https://generativelanguage.googleapis.com/v1beta/models"
    );

    url.searchParams.set("key", env.GEMINI_API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Gemini model discovery failed: ${response.status} ${text}`
      );
    }

    const data = await response.json() as GeminiModelsResponse;

    models.push(...(data.models ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return models;
}

function modelId(name: string): string {
  return name.replace(/^models\//, "");
}

function isCompatibleTextModel(model: GeminiModel): boolean {
  const name = model.name ?? "";
  const methods = model.supportedGenerationMethods ?? [];
  const id = modelId(name).toLowerCase();

  if (!id) return false;

  if (!methods.includes("generateContent")) {
    return false;
  }

  if (
    id.includes("embedding") ||
    id.includes("image") ||
    id.includes("tts") ||
    id.includes("audio") ||
    id.includes("aqa")
  ) {
    return false;
  }

  return (
    id.includes("gemini") ||
    id.includes("flash") ||
    id.includes("pro")
  );
}

function modelPriority(name: string): number {
  const id = modelId(name).toLowerCase();

  let score = 0;

  if (id.includes("latest")) score += 1000;

  if (id.includes("flash")) score += 100;
  if (id.includes("pro")) score += 80;

  if (id.includes("3.6")) score += 60;
  else if (id.includes("3.5")) score += 50;
  else if (id.includes("3.0")) score += 40;
  else if (id.includes("2.5")) score += 30;
  else if (id.includes("2.0")) score += 20;
  else if (id.includes("1.5")) score += 10;

  if (id.includes("preview")) score -= 5;
  if (id.includes("experimental")) score -= 10;

  return score;
}

export async function resolveGeminiModel(): Promise<string> {
  if (cachedModel) {
    return cachedModel;
  }

  const configured = env.GEMINI_MODEL?.trim();

  if (configured) {
    const models = await listGeminiModels();

    const exact = models.find(
      (model) =>
        modelId(model.name ?? "") ===
        modelId(configured) &&
        isCompatibleTextModel(model)
    );

    if (exact?.name) {
      cachedModel = modelId(exact.name);
      console.log(`Gemini model: ${cachedModel}`);
      return cachedModel;
    }
  }

  const models = await listGeminiModels();

  const compatible = models
    .filter(isCompatibleTextModel)
    .filter((model) => Boolean(model.name))
    .sort(
      (a, b) =>
        modelPriority(b.name ?? "") -
        modelPriority(a.name ?? "")
    );

  const selected = compatible[0];

  if (!selected?.name) {
    console.error(
      "Gemini models returned by API:",
      models.map((model) => ({
        name: model.name,
        supportedGenerationMethods:
          model.supportedGenerationMethods,
      }))
    );

    throw new Error(
      "No compatible Gemini text model was found."
    );
  }

  cachedModel = modelId(selected.name);

  console.log(`Gemini model: ${cachedModel}`);

  return cachedModel;
}
