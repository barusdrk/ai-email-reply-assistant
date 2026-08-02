import API from "./api.js";

export type AIProvider =
  | "openai"
  | "groq"
  | "gemini";

export interface AISettings {
  provider: AIProvider;

  defaultTone: string;

  defaultLength: string;

  temperature: number;

  maxDailyReplies: number;

  autoDraft: boolean;

  openAiApiKey?: string;

  groqApiKey?: string;

  geminiApiKey?: string;
}

export async function getSettings() {
  const { data } =
    await API.get<AISettings>(
      "/settings"
    );

  return data;
}

export async function updateSettings(
  settings: Partial<AISettings>
) {
  const { data } =
    await API.put<AISettings>(
      "/settings",
      settings
    );

  return data;
}

export function updateProvider(
  provider: AIProvider
) {
  return updateSettings({
    provider,
  });
}

export function updateApiKeys(
  keys: {
    openAiApiKey?: string;
    groqApiKey?: string;
    geminiApiKey?: string;
  }
) {
  return updateSettings(keys);
}

export function updateDefaults(
  defaultTone: string,
  defaultLength: string
) {
  return updateSettings({
    defaultTone,
    defaultLength,
  });
}

export function updateTemperature(
  temperature: number
) {
  return updateSettings({
    temperature,
  });
}

export function updateAutoDraft(
  autoDraft: boolean
) {
  return updateSettings({
    autoDraft,
  });
}

export function updateDailyLimit(
  maxDailyReplies: number
) {
  return updateSettings({
    maxDailyReplies,
  });
}
