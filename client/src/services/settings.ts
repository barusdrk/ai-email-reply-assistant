import API from "./api.js";
import type {
  AISettings,
  AIProvider,
  ReplyTone,
  Theme,
} from "../types/settings.js";

export type {
  AISettings,
  AIProvider,
  ReplyTone,
  Theme,
};

interface SettingsResponse {
  success?: boolean;
  settings?: AISettings;
}

export async function getSettings(): Promise<AISettings> {
  const { data } = await API.get<
    AISettings | SettingsResponse
  >("/settings");

  if ("settings" in data && data.settings) {
    return data.settings;
  }

  return data as AISettings;
}

export async function updateSettings(
  settings: Partial<AISettings>
): Promise<AISettings> {
  const { data } = await API.put<
    AISettings | SettingsResponse
  >("/settings", settings);

  if ("settings" in data && data.settings) {
    return data.settings;
  }

  return data as AISettings;
}

export function updateProvider(
  provider: AIProvider
) {
  return updateSettings({
    provider,
  });
}

export function updateDefaultReplyTone(
  defaultReplyTone: ReplyTone
) {
  return updateSettings({
    defaultReplyTone,
  });
}

export function updateDefaultLength(
  defaultLength:
    | "short"
    | "medium"
    | "long"
) {
  return updateSettings({
    defaultLength,
  });
}

export function updateAutoDraft(
  autoDraft: boolean
) {
  return updateSettings({
    autoDraft,
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

export function updateAppearance(
  data: {
    theme?: Theme;
    language?: string;
    timezone?: string;
  }
) {
  return updateSettings(data);
}
