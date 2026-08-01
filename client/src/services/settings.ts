import API from "./api.js";

export interface AISettings {
  provider:
    | "openai"
    | "gemini";

  openAiApiKey?: string;

  geminiApiKey?: string;

  defaultTone: string;

  defaultLength: string;

  temperature: number;

  maxDailyReplies: number;
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

export async function updateProvider(
  provider:
    | "openai"
    | "gemini"
) {
  return updateSettings({
    provider,
  });
}

export async function updateApiKeys(
  keys: {
    openAiApiKey?: string;
    geminiApiKey?: string;
  }
) {
  return updateSettings(keys);
}
